import * as config from "../config.js";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import jwt from "jsonwebtoken";
import { emailTemplate } from "../helpers/emails.js";
import { hashPassword, comparePassword } from "../helpers/auth.js";
import { nanoid } from "nanoid";
import User from "../models/user.js";
import validator from "email-validator";

export const tokenAndUserResponse = (req, res, user) => {
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
};

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

    //If they try to click on link again after registering
    const userExist = await User.findOne({ email });
    if (user) {
      return res.json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await hashPassword(password);

    const user = await new User({
      username: nanoid(6),
      email,
      password: hashedPassword,
    });

    //Adding user to the databse
    await user.save();

    //Creating JWT token and send response
    tokenAndUserResponse(req, res, user);
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
    //Create JWT Token and send response
    tokenAndUserResponse(req, res, user);
  } catch (err) {
    console.log(err);
    return res.json({ error: "Something went wrong. Try Again" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    //Get the email for which we have to reset the code
    const { email } = req.body;
    const user = await User.findOne({ email });

    //Since we have to reset the password we create a temp reset code and add it to the user
    if (!user) {
      return res.json({ error: "Could not find user with this email" });
    } else {
      const resetCode = nanoid();
      user.resetCode = resetCode;
      const name = user.name;
      await user.save();

      const token = jwt.sign({ resetCode }, config.JWT_SECRET, {
        expiresIn: "1hr",
      });
      //send email
      const command = new SendEmailCommand(
        emailTemplate(
          email,
          name,
          `<p>Please click the link below to access your account.</p>
                <a href="${config.CLIENT_URL}/auth/access-account/${token}">Access my Account</a>`,
          config.REPLY_TO,
          "Access your account"
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
      //end send email
    }
  } catch (err) {
    console.log(err);
    return res.json({ error: "Something went wrong. Try Again" });
  }
};

export const accessAccount = async (req, res) => {
  try {
    // Decode the resetcode from the access account url in email
    const { resetCode } = jwt.verify(req.body.resetCode, config.JWT_SECRET);

    // Find the user account using the resetcode and once it's used it's set to empty
    //so that the user doesnt use it multiple times to login
    const user = await User.findOneAndUpdate(
      { resetCode: resetCode },
      { resetCode: "" }
    );

    tokenAndUserResponse(req, res, user);
  } catch (err) {
    return res.json({ error: "Something went wrong. Try Again." });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { _id } = jwt.verify(req.headers.refreshToken, config.JWT_SECRET);
    const user = await User.findById(_id);

    tokenAndUserResponse(req, res, user);
  } catch (err) {
    return res.json({ error: "Something went wrong. Try Again!" });
  }
};
