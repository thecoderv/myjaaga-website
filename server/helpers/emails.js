import * as config from "../config.js";

const style = `font-size:15px;`;

export const emailTemplate = (email, name, content, replyTo, subject) => {
  return {
    Source: config.EMAIL_FROM,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `<html>
          <p>Hi ${name}!</p>
              ${content}
              <p style=${style}>&copy; ${new Date().getFullYear()}
              </html>`,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Welcome to MyJaaga.`,
      },
    },
  };
};
