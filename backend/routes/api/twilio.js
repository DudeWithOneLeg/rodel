const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const twilioSID = process.env.TWILIO_ACCOUNT_SID;
const twilioAPISID = process.env.TWILIO_API_SID
const twilioAPISecret = process.env.TWILIO_API_SECRET;
const twilioAuthToken = process.env.TWILIO_ACCOUNT_AUTH_TOKEN;

const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

router.post('/', async (req, res) => {
  const client = twilio(twilioSID, twilioAuthToken);

  async function createToken() {
    const token = await client.tokens.create();

    return token;
  }
  const token = await createToken();
  console.log(token)
  res.send(token)
  // console.log('Token route hit');
  // console.log('Query params:', req.body);


  // const {identity, room} = req.body
  // // Create an access token which we will sign and return to the client,
  // // containing the grant we just created
  // const token = new AccessToken(
  //   twilioSID,
  //   twilioAPISID,
  //   twilioAPISecret,
  //   { identity: identity }
  // );

  // // Assign identity to the token
  // token.identity = identity;

  // // Grant the access token Twilio Video capabilities
  // const grant = new VideoGrant();
  // grant.room = room;
  // token.addGrant(grant);

  // // Serialize the token to a JWT string
  // console.log(token)
  // res.send(token.toJwt());
})

module.exports = router;
