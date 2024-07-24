import * as config from "../config.js";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import jwt from "jsonwebtoken";
import { emailTemplate } from "../helpers/emails.js";
import { hashPassword, comparePassword } from "../helpers/auth.js";
import { nanoid } from "nanoid";
import User from "../models/user.js";

export const welcome = (req, res) => {
  res.json({
    data: "Hello we need to authenticate!",
  });
};

export const preRegister = async (req, res) => {
  try {
    console.log(req.body);
    const { email, name, password } = req.body;
    const token = jwt.sign({ email, password }, config.JWT_SECRET, {
      expiresIn: "1h",
    });

    const command = new SendEmailCommand(
      emailTemplate(
        email,
        name,
        `<p>Please click the link below to activate your account.</p>
              <a href="${config.CLIENT_URL}/auth/account-activate/${token}">Activate my account</a>`,
        config.REPLY_TO,
        "Activate your Account"
      )
    );
    try {
      const data = await config.AWSSES.send(command);
      console.log(data);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.json({ ok: false });
    }
  } catch (err) {
    console.error(err);
    return res.json({ error: "Something went wrong try again!" });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password } = jwt.verify(req.body.token, config.JWT_SECRET);

    const hashedPassword = await hashPassword(password);

    const user = await new User({
      username: nanoid(6),
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign({ _id: user._id }, config.JWT_SECRET, {
      expiresIn: "1hr",
    });

    const refreshToken = jwt.sign({ _id: user._id }, config.JWT_SECRET, {
      expiresIn: "7d",
    });
    user.password = undefined;
    user.resetCode = undefined;
    return res.json({
      token,
      refreshToken,
      user,
      status: "Registered and LoggedIn",
    });
  } catch (err) {
    console.log(err);
    return res.json({
      error: "Something went wrong try again!",
      status: "Regisration failed",
    });
  }
};
