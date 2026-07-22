const CURRENCY = 'GBP';
const AMOUNT = '450.00';
const symbols = { GBP: '£', EUR: '€', USD: '$' };

const storedAmount = sessionStorage.getItem('bt_amount') || AMOUNT;
const storedCurrency = sessionStorage.getItem('bt_currency') || CURRENCY;
const symbol = symbols[storedCurrency] || '';

document.getElementById('totalDisplay').textContent = symbol + storedAmount + ' ' + storedCurrency;

document.getElementById('proceedBtn').addEventListener('click', () => {
    sessionStorage.setItem('bt_currency', storedCurrency);
    sessionStorage.setItem('bt_amount', storedAmount);
    window.location.href = '/payment';
});
