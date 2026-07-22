const express = require("express");
const router = express.Router();
const braintree = require("braintree");
const CREATE_TRUSTLY_CONTEXT = `
  mutation CreateNonInstantLocalPaymentContext($input: CreateNonInstantLocalPaymentContextInput!) {
    createNonInstantLocalPaymentContext(input: $input) {
      paymentContext { approvalUrl }
    }
  }
`;
require("dotenv").config();

// Gateway credentials pulled from .env file
const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BT_MERCHANT_ID,
  publicKey: process.env.BT_PUBLIC_KEY,
  privateKey: process.env.BT_PRIVATE_KEY,
});

// Endpoint for access token
router.get("/", (req, res) => {
  gateway.clientToken.generate({ merchantAccountId: process.env.BT_GBP_MAID })
    .then(response => res.json(response))
    .catch(err => {
      console.error('Client token generation error:', err);
      res.status(500).send('Failed to generate client token');
    })
})

// Endpoint for FX quote
// The markup stacks on top of the Braintree fee, not instead of it. Do not pass a markup fee, it is already set on your production account.
// ** NB: This will only work in production mode. **
router.get("/fx-quote", (req, res) => {
  let exchangeRateQuoteRequest = {
    quotes: [
      {
        baseCurrency: "GBP",
        quoteCurrency: "EUR",
        baseAmount: "1"
      }
    ]
  }
  gateway.exchangeRateQuote.generate(exchangeRateQuoteRequest)
    .then(response => res.json(response))
    .catch(err => console.error(err))
})

// Endpoint for transaction capture/settlement
router.post("/", (req, res, next) => {
  const { paymentMethodNonce, amount, deviceData } = req.body;
  const orderId = 'SCH001|INV' + Math.floor(1000000 + Math.random() * 9000000);

  gateway.transaction
    .sale({
      amount: amount,
      paymentMethodNonce: paymentMethodNonce,
      deviceData: deviceData,
      orderId: orderId,
      merchantAccountId: process.env.BT_EUR_MAID,
      options: {
        submitForSettlement: true,
      }
    }).then(result => res.send(result));
});

// Endpoint for creating Trustly payment context
router.post('/lpm-trustly', async (req, res) => {
  try {
    const { givenName, familyName, phoneNumber, amount, email } = req.body;
    const response = await gateway.graphQLClient.query(CREATE_TRUSTLY_CONTEXT, {
      input: {
        paymentContext: {
          amount: { value: amount, currencyCode: 'GBP' },
          type: 'TRUSTLY',
          countryCode: 'GB',
          returnUrl: 'http://localhost:3000/checkout/complete',
          cancelUrl: 'http://localhost:3000/checkout/cancel',
          merchantAccountId: process.env.BT_EUR_MAID,
          payerInfo: { givenName, surname: familyName, phoneNumber, email },
        },
      },
    });
    if (response.errors?.length) {
      console.error('Trustly GraphQL errors:', JSON.stringify(response.errors, null, 2));
      return res.status(500).send(response.errors[0].message);
    }
    res.send(response.data.createNonInstantLocalPaymentContext.paymentContext.approvalUrl);
  } catch (err) {
    console.error('Trustly route error:', err);
    res.status(500).send('Failed to create Trustly payment context');
  }
});

module.exports = router;