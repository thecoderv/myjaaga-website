import * as config from "../config.js";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import jwt from "jsonwebtoken";
import { emailTemplate } from "../helpers/emails.js";
import { hashPassword, comparePassword } from "../helpers/auth.js";
import { nanoid } from "nanoid";
import User from "../models/user.js";
import validator from "email-validator";

export const welcome = (req, res) => {
  res.json({
    data: "Hello we need to authenticate!",
  });
};

export const preRegister = async (req, res) => {
  try {
    // console.log(req.body);
    const { email, name, password } = req.body;

    //Validating email and password
    if (!validator.validate(email)) {
      return res.json({ error: "Invalid email." });
    }
    if (!password) {
      return res.json({ error: "Password is required." });
    }

    if (password && password?.length < 8) {
      return res.json({ error: "Password should be at least 6 characters" });
    }

    //If user is already registered with the email then thats an error

    const user = await User.findOne({ email });
    if (user) {
      return res.json({ error: "An account with this email already exists." });
    }

    // JWT Token for the corresponding email and password.
    // This will be sent to the user via email
    const token = jwt.sign({ email, password }, config.JWT_SECRET, {
      expiresIn: "1h",
    });

    // New AWS SES v3 format
    // Dont edit your template here, edit it in helper
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
    //when user clicks on the link in email we need to verify and registration is completed

    const { email, password } = jwt.verify(req.body.token, config.JWT_SECRET);

    const hashedPassword = await hashPassword(password);

    const user = await new User({
      username: nanoid(6),
      email,
      password: hashedPassword,
    });

    //Adding user to the databse

    await user.save();

    //Creating JWT token

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
    });
  } catch (err) {
    console.log(err);
    return res.json({
      error: "Something went wrong try again!",
      status: "Regisration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get the user form the email provided
    const user = await User.findOne({ email });

    // Compare the password
    const match = await comparePassword(password, user.password);
    if (!match) {
      return res.json({ error: "Wrong password" });
    }
    //Create JWT Token
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
    });
    
  } catch (err) {
    console.log(err);
    return res.json({ error: "Something went wrong. Try Again" });
  }
};
