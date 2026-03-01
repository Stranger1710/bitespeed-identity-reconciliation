import { PrismaClient, Contact } from "@prisma/client";

const prisma = new PrismaClient();

export const identifyContact = async (
  email?: string,
  phoneNumber?: string
) => {

  return prisma.$transaction(async (tx) => {

    const matchedContacts: Contact[] = await tx.contact.findMany({
      where: {
        OR: [
          { email: email ?? undefined },
          { phoneNumber: phoneNumber ?? undefined }
        ]
      }
    });

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

    const matchedIds = matchedContacts.map((c: Contact) => c.id);

    const allContacts: Contact[] = await tx.contact.findMany({
      where: {
        OR: [
          { id: { in: matchedIds } },
          { linkedId: { in: matchedIds } }
        ]
      }
    });

    const primaryContacts: Contact[] = allContacts.filter(
      (c: Contact) => c.linkPrecedence === "primary"
    );

    const oldestPrimary: Contact = primaryContacts.sort(
      (a: Contact, b: Contact) =>
        a.createdAt.getTime() - b.createdAt.getTime()
    )[0];

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

    const existingEmails = new Set(
      allContacts.map((c: Contact) => c.email).filter(Boolean)
    );

    const existingPhones = new Set(
      allContacts.map((c: Contact) => c.phoneNumber).filter(Boolean)
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

  const contacts: Contact[] = await tx.contact.findMany({
    where: {
      OR: [
        { id: primaryId },
        { linkedId: primaryId }
      ]
    }
  });

  const primary = contacts.find(
    (c: Contact) => c.id === primaryId
  ) as Contact;

  const emails = [
    primary.email,
    ...contacts
      .filter((c: Contact) => c.id !== primaryId)
      .map((c: Contact) => c.email)
  ].filter(Boolean) as string[];

  const phoneNumbers = [
    primary.phoneNumber,
    ...contacts
      .filter((c: Contact) => c.id !== primaryId)
      .map((c: Contact) => c.phoneNumber)
  ].filter(Boolean) as string[];

  const secondaryContactIds = contacts
    .filter((c: Contact) => c.linkPrecedence === "secondary")
    .map((c: Contact) => c.id);

  return {
    contact: {
      primaryContactId: primary.id,
      emails: [...new Set(emails)],
      phoneNumbers: [...new Set(phoneNumbers)],
      secondaryContactIds
    }
  };
};