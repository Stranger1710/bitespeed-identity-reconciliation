import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const identifyContact = async (
  email?: string,
  phoneNumber?: string
) => {

  return prisma.$transaction(async (tx) => {

    // Step 1: Find matching contacts
    const matchedContacts = await tx.contact.findMany({
      where: {
        OR: [
          { email: email ?? undefined },
          { phoneNumber: phoneNumber ?? undefined }
        ]
      }
    });

    // Step 2: No matches → create new primary
    if (matchedContacts.length === 0) {
      const newContact = await tx.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary"
        }
      });

      return buildResponse(tx, newContact.id);
    }

    // Step 3: Get all connected contacts
    const matchedIds = matchedContacts.map(c => c.id);

    const allContacts = await tx.contact.findMany({
      where: {
        OR: [
          { id: { in: matchedIds } },
          { linkedId: { in: matchedIds } }
        ]
      }
    });

    // Step 4: Determine oldest primary
    const primaryContacts = allContacts.filter(
      c => c.linkPrecedence === "primary"
    );

    const oldestPrimary = primaryContacts.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )[0];

    // Step 5: Merge multiple primaries
    for (const contact of primaryContacts) {
      if (contact.id !== oldestPrimary.id) {
        await tx.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: "secondary",
            linkedId: oldestPrimary.id
          }
        });
      }
    }

    // Step 6: Detect new information
    const existingEmails = new Set(
      allContacts.map(c => c.email).filter(Boolean)
    );

    const existingPhones = new Set(
      allContacts.map(c => c.phoneNumber).filter(Boolean)
    );

    const isNewEmail = email && !existingEmails.has(email);
    const isNewPhone = phoneNumber && !existingPhones.has(phoneNumber);

    if (isNewEmail || isNewPhone) {
      await tx.contact.create({
        data: {
          email,
          phoneNumber,
          linkedId: oldestPrimary.id,
          linkPrecedence: "secondary"
        }
      });
    }

    return buildResponse(tx, oldestPrimary.id);
  });
};

const buildResponse = async (tx: any, primaryId: number) => {

  const contacts = await tx.contact.findMany({
    where: {
      OR: [
        { id: primaryId },
        { linkedId: primaryId }
      ]
    }
  });

  const primary = contacts.find(c => c.id === primaryId)!;

  const emails = [
    primary.email,
    ...contacts.filter(c => c.id !== primaryId).map(c => c.email)
  ].filter(Boolean);

  const phoneNumbers = [
    primary.phoneNumber,
    ...contacts.filter(c => c.id !== primaryId).map(c => c.phoneNumber)
  ].filter(Boolean);

  const secondaryContactIds = contacts
    .filter(c => c.linkPrecedence === "secondary")
    .map(c => c.id);

  return {
    contact: {
      primaryContactId: primary.id,
      emails: [...new Set(emails)],
      phoneNumbers: [...new Set(phoneNumbers)],
      secondaryContactIds
    }
  };
};