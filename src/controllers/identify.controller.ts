import { Request, Response } from "express";
import { identifyContact } from "../services/identity.service";

export const identifyHandler = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Either email or phoneNumber must be provided"
      });
    }

    const result = await identifyContact(email, phoneNumber);
    return res.status(200).json(result);

  } catch (error) {
    console.error("Identify Error:", error);
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
};