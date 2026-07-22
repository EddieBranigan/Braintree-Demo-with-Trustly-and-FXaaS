const currency = sessionStorage.getItem('bt_currency') || 'GBP';
let amount = "1.00";
var payButton = document.getElementById("submit");

const responseModal = document.getElementById("responseModal");
const modalContent = document.getElementById("modalContent");
const cogBtn = document.getElementById("cogBtn");
const modalClose = document.getElementById("modalClose");

function goToReview(result) {
  sessionStorage.setItem('bt_result', JSON.stringify(result));
  window.location.href = '/review';
}

if (cogBtn) cogBtn.addEventListener("click", () => { responseModal.hidden = false; });
if (modalClose) modalClose.addEventListener("click", () => { responseModal.hidden = true; });
if (responseModal) responseModal.addEventListener("click", (e) => {
  if (e.target === responseModal) responseModal.hidden = true;
});

let buyerAddress = {
  givenName: "Sherlock",
  surname: "Holmes",
  streetAddress: "221B Baker Street",
  locality: "London",
  postalCode: "NW1 6XE",
  countryCodeAlpha2: "GB"
};

let lineItems = [{
  quantity: '1',
  unitAmount: amount,
  name: 'Test product',
  kind: 'debit',
  description: 'A description of the product up to 127 characters',
  productCode: '123ABC'
}]

const applePaySupported = !!(
  window.ApplePaySession &&
  ApplePaySession.supportsVersion(3) &&
  ApplePaySession.canMakePayments()
);

fetch('/checkout')
  .then(response => response.json())
  .then(data => data.clientToken)
  .then(clientToken => braintree.client.create({ authorization: clientToken }))
  .then(clientInstance => Promise.all([
    braintree.paypalCheckout.create({ client: clientInstance }),
    braintree.dataCollector.create({ client: clientInstance }),
    braintree.hostedFields.create({
      client: clientInstance,
      styles: {
        input: { "text-align": "center" }
      },
      fields: {
        number: {
          selector: "#hfCardNumber",
          prefill: "4000 0000 0000 1091"
        },
        cvv: {
          selector: "#hfCvv",
          prefill: "123"
        },
        expirationDate: {
          selector: "#hfExpiry",
          prefill: "01/2027"
        }
      }
    }),
    braintree.threeDSecure.create({
      client: clientInstance,
      version: 2
    }),
    applePaySupported
      ? braintree.applePay.create({ client: clientInstance })
      : Promise.resolve(null)
  ]))
  .then(([paypalCheckout, dataCollector, hostedFieldsInstance, threeDSecureInstance, applePayInstance]) => {
    const deviceData = dataCollector.deviceData;

    // Hosted Fields + 3DS card pay flow
    if (payButton) {
      payButton.addEventListener("click", () => {
        hostedFieldsInstance.tokenize()
          .then((payload) => {
            return threeDSecureInstance.verifyCard({
              onLookupComplete: (data, next) => {
                next();
              },
              collectDeviceData: true,
              challengeRequested: true,
              amount: amount,
              nonce: payload.nonce,
              bin: payload.details.bin,
              billingAddress: buyerAddress
            });
          })
          .then((payload) => {
            return fetch('/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentMethodNonce: payload.nonce,
                amount: amount,
                deviceData: deviceData
              })
            });
          })
          .then(response => response.json())
          .then(result => {
            goToReview(result);
          })
          .catch((error) => alert("Error during card payment: " + error));
      });
    }

    // PayPal payment method flow

    // // Intialise paypal checkout component
    // paypalCheckout.loadPayPalSDK({
    //   vault: false,
    //   components: 'buttons',
    //   currency: currency,
    //   "buyer-country": "GB",
    //   intent: 'capture',
    //   dataAttributes: {
    //     amount: amount
    //   }
    // }).then(() => {

    //   // PayPal flow
    //   var button = paypal.Buttons({
    //     fundingSource: paypal.FUNDING.PAYPAL,
    //     style: {
    //       color: 'gold',
    //       shape: 'rect',
    //       disableMaxWidth: "true"
    //     },

    //     createOrder: () => {
    //       return paypalCheckout.createPayment({
    //         flow: 'checkout',
    //         amount: amount,
    //         currency: currency,
    //         intent: 'capture',
    //         lineItems: lineItems,
    //         shippingAddressEditable: 'false',
    //       });
    //     },

    //     onApprove: (data, actions) => {
    //       return paypalCheckout.tokenizePayment(data)
    //         .then((payload) => {
    //           return fetch('/checkout', {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify({
    //               paymentMethodNonce: payload.nonce,
    //               amount: amount,
    //               deviceData: deviceData
    //             })
    //           });
    //         })
    //         .then(response => response.json())
    //         .then(result => {
    //           goToReview(result);
    //         })
    //     },

    //     onError: (error) => {
    //       console.error(error);
    //     },

    //     onCancel: (data) => {
    //       console.log('Payment cancelled' + data);
    //     }
    //   });
    //   button.render("#paypalButton");

    // });

    // Apple Pay flow
    if (applePayInstance) {
      console.log("Apple Pay is supported");

      const appleBtn = document.createElement("apple-pay-button");
      appleBtn.setAttribute("buttonstyle", "black");
      appleBtn.setAttribute("type", "plain");
      appleBtn.setAttribute("locale", "en-GB");
      appleBtn.style.cssText = "width:100%; height:48px; display:block;";
      document.getElementById("applePayButton").appendChild(appleBtn);

      appleBtn.addEventListener("click", (clickEvent) => {
        clickEvent.preventDefault();

        var recurringPaymentRequest = applePayInstance.createPaymentRequest({
          total: {
            label: "Merchant",
            amount: amount
          },
          paymentDescription: "Payment description of basic recurring payment.",
          regularBilling: {
            label: "Merchant payment",
            amount: amount,
            type: "final",
            paymentTiming: "recurring",
            recurringPaymentStartDate: "2025-12-31T00:00:00:000Z"
          },
          managementURL: "https://www.merchant.com/update-payment"
        });

        var session = new ApplePaySession(1, recurringPaymentRequest);

        session.onvalidatemerchant = (event) => {
          applePayInstance
            .performValidation({
              validationURL: event.validationURL,
              displayName: "Merchant"
            })
            .then((merchantSession) => {
              session.completeMerchantValidation(merchantSession);
            });
        };

        session.onpaymentauthorized = (event) => {
          applePayInstance
            .tokenize({ token: event.payment.token })
            .then((payload) => {
              session.completePayment(ApplePaySession.STATUS_SUCCESS);
              return fetch('/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentMethodNonce: payload.nonce,
                  amount: amount,
                  deviceData: deviceData
                })
              });
            })
            .then(response => response.json())
            .then(result => {
              goToReview(result);
            })
            .catch((err) => {
              session.completePayment(ApplePaySession.STATUS_FAILURE);
              console.error("Apple Pay tokenization error:", err);
            });
        };

        session.begin();
      });
    } else {
      console.log("Apple Pay is not supported in this browser");
    }

  }).catch((error) => {
    console.log('Error loading the PayPal SDK:', error);
  });

  // currency and amount display on payment page
(function() {
    const symbols = { GBP: '£', EUR: '€', USD: '$' };
    const c = sessionStorage.getItem('bt_currency') || 'GBP';
    const a = sessionStorage.getItem('bt_amount') || '50.00';
    const el = document.getElementById('summaryAmount');
    if (el) el.textContent = (symbols[c] || '') + a + ' ' + c;
})();

function updateTrustlyButton() {
    const btn = document.getElementById('trustlyButton');
    const filled = document.getElementById('trustlyFirstName').value.trim().length > 0
        && document.getElementById('trustlyLastName').value.trim().length > 0
        && document.getElementById('trustlyPhone').value.trim().length > 0
        && document.getElementById('trustlyEmail').value.trim().length > 0;
    btn.disabled = !filled;
    btn.style.opacity = filled ? '1' : '0.5';
    btn.style.cursor = filled ? 'pointer' : 'not-allowed';
}
document.getElementById('trustlyFirstName').addEventListener('input', updateTrustlyButton);
document.getElementById('trustlyLastName').addEventListener('input', updateTrustlyButton);
document.getElementById('trustlyPhone').addEventListener('input', updateTrustlyButton);
document.getElementById('trustlyEmail').addEventListener('input', updateTrustlyButton);

document.getElementById('trustlyButton').addEventListener('click', async function() {
    const givenName = document.getElementById('trustlyFirstName').value.trim();
    const familyName = document.getElementById('trustlyLastName').value.trim();
    const phoneNumber = document.getElementById('trustlyPhone').value.trim();
    const email = document.getElementById('trustlyEmail').value.trim();
    const amount = sessionStorage.getItem('bt_amount') || '50.00';
    this.disabled = true;
    this.style.opacity = '0.5';
    // fetch lpm trustly url for customer
    try {
        const response = await fetch('/checkout/lpm-trustly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ givenName, familyName, phoneNumber, email, amount }),
        });
        if (!response.ok) throw new Error('Request failed: ' + response.status);
        const url = await response.text();
        window.location.href = url;
    } catch (err) {
        console.error('Trustly error:', err);
        alert('Could not initiate Trustly payment. Please try again.');
        this.disabled = false;
        this.style.opacity = '1';
    }
});
