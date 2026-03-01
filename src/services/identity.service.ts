import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const identifyContact = async (
  email?: string,
  phoneNumber?: string
) => {

  const matchedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email ?? undefined },
        { phoneNumber: phoneNumber ?? undefined }
      ]
    }
  });

  if (matchedContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary"
      }
    });

    return buildResponse(newContact.id);
  }

  const contactIds = matchedContacts.map(c => c.id);

  const allRelatedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: contactIds } },
        { linkedId: { in: contactIds } }
      ]
    }
  });

  const primaryContacts = allRelatedContacts.filter(
    c => c.linkPrecedence === "primary"
  );

  const oldestPrimary = primaryContacts.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )[0];

  for (const contact of primaryContacts) {
    if (contact.id !== oldestPrimary.id) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: oldestPrimary.id
        }
      });
    }
  }

  const emails = allRelatedContacts.map(c => c.email);
  const phones = allRelatedContacts.map(c => c.phoneNumber);

  const isNewEmail = email && !emails.includes(email);
  const isNewPhone = phoneNumber && !phones.includes(phoneNumber);

  if (isNewEmail || isNewPhone) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: oldestPrimary.id,
        linkPrecedence: "secondary"
      }
    });
  }

  return buildResponse(oldestPrimary.id);
};

const buildResponse = async (primaryId: number) => {

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primaryId },
        { linkedId: primaryId }
      ]
    }
  });

  const primary = contacts.find(c => c.id === primaryId)!;

  const emails = [...new Set(
    contacts.map(c => c.email).filter(Boolean)
  )];

  const phoneNumbers = [...new Set(
    contacts.map(c => c.phoneNumber).filter(Boolean)
  )];

  const secondaryContactIds = contacts
    .filter(c => c.linkPrecedence === "secondary")
    .map(c => c.id);

  return {
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds
    }
  };
};
