# Bitespeed Backend Task - Identity Reconciliation

## 🔗 Hosted Endpoint

POST https://bitespeed-api-vcwp.onrender.com/identify

---

## 📌 Overview

This service implements identity reconciliation for customers placing orders using different emails and phone numbers.

It consolidates multiple contact records into a single primary identity while maintaining correct linkage using primary and secondary contacts.

The oldest contact is always treated as the primary contact.

---

## 🛠 Tech Stack

- Node.js
- TypeScript
- Express
- PostgreSQL (Render)
- Prisma ORM

---

## ⚙️ Setup & Local Development

Follow these steps to run the project locally:

1. Install dependencies

```bash
npm install