import { Request, Response } from "express";
import { identifyContact } from "../services/identity.service";

export const identifyHandler = async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided"
    });
  }

  const result = await identifyContact(email, phoneNumber);

  return res.status(200).json(result);
};
