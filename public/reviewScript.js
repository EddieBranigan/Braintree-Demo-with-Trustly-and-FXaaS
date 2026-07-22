const currencySymbols = { GBP: '£', EUR: '€', USD: '$' };

function statusChipClass(status) {
    if (!status) return 'status-chip--default';
    const s = status.toLowerCase();
    if (s === 'authorized') return 'status-chip--authorized';
    if (s.includes('settlement')) return 'status-chip--submitted';
    if (s === 'settled') return 'status-chip--settled';
    if (s.includes('fail') || s.includes('declined')) return 'status-chip--failed';
    return 'status-chip--default';
}

function formatStatus(status) {
    if (!status) return '—';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch { return iso; }
}

function row(label, valueHtml) {
    return `<div class="review-row">
        <span class="review-row-label">${label}</span>
        <span class="review-row-value">${valueHtml}</span>
    </div>`;
}

function buildPaymentMethodRows(tx) {
    const type = tx.paymentInstrumentType || '';
    const el = document.getElementById('paymentMethodRows');

    if (type === 'credit_card') {
        const cc = tx.creditCardDetails || tx.creditCard || {};
        el.innerHTML =
            row('Type', `<span class="method-badge"><span class="method-icon">💳</span> ${cc.cardType || '—'}</span>`) +
            row('Card Number', cc.maskedNumber || '—') +
            row('Expiry', cc.expirationDate || '—');
    } else if (type === 'paypal_account') {
        const pp = tx.paypalDetails || tx.paypal || {};
        el.innerHTML =
            row('Type', `<span class="method-badge"><span class="method-icon">🅿️</span> PayPal</span>`) +
            row('Payer Email', pp.payerEmail || '—') +
            row('PayPal Payment ID', `<span style="font-family:monospace;font-size:12px;color:#555">${pp.paymentId || pp.authorizationId || '—'}</span>`);
    } else {
        el.innerHTML = row('Type', formatStatus(type) || '—');
    }
}

function buildTdsRows(tx) {
    const tds = tx.threeDSecureInfo;
    if (!tds) return;

    document.getElementById('tdsSection').hidden = false;
    const tdsRows = document.getElementById('tdsRows');

    const shifted = tds.liabilityShifted;
    const shiftedHtml = shifted === true
        ? '<span class="tds-chip tds-chip--pass">Yes — Shifted</span>'
        : shifted === false
            ? '<span class="tds-chip tds-chip--fail">No</span>'
            : '<span class="tds-chip tds-chip--na">N/A</span>';

    tdsRows.innerHTML =
        row('Auth Status', `<span class="tds-chip ${tds.status && tds.status.includes('successful') ? 'tds-chip--pass' : 'tds-chip--na'}">${formatStatus(tds.status)}</span>`) +
        row('Enrolled', tds.enrolled || '—') +
        row('Liability Shifted', shiftedHtml) +
        row('Liability Shift Possible', tds.liabilityShiftPossible != null
            ? `<span class="tds-chip ${tds.liabilityShiftPossible ? 'tds-chip--pass' : 'tds-chip--na'}">${tds.liabilityShiftPossible ? 'Yes' : 'No'}</span>`
            : '—');
}

const raw = sessionStorage.getItem('bt_result');
if (!raw) {
    document.getElementById('noData').hidden = false;
} else {
    const result = JSON.parse(raw);
    const tx = result.transaction || {};
    const success = result.success === true;

    document.getElementById('reviewMain').hidden = false;

    // Status banner
    const banner = document.getElementById('statusBanner');
    if (success) {
        banner.className = 'status-banner status-banner--success';
        banner.innerHTML = '<span class="status-icon">✓</span> Payment successful — transaction captured.';
        document.getElementById('stepNumTx').classList.add('step-number--success');
    } else {
        banner.className = 'status-banner status-banner--failure';
        const msg = result.message || (result.errors && JSON.stringify(result.errors)) || 'Payment failed.';
        banner.innerHTML = `<span class="status-icon">✗</span> ${msg}`;
        document.getElementById('stepNumTx').classList.add('step-number--failure');
    }

    // Transaction fields
    document.getElementById('txId').textContent = tx.id || '—';

    const statusEl = document.getElementById('txStatus');
    statusEl.innerHTML = `<span class="status-chip ${statusChipClass(tx.status)}">${formatStatus(tx.status)}</span>`;

    const currency = tx.currencyIsoCode || '';
    const symbol = currencySymbols[currency] || '';
    document.getElementById('txAmount').textContent = tx.amount ? `${symbol}${tx.amount} ${currency}` : '—';
    document.getElementById('txDate').textContent = formatDate(tx.createdAt);
    document.getElementById('txOrderId').textContent = tx.orderId || '—';
    document.getElementById('txMerchant').textContent = tx.merchantAccountId || '—';
    document.getElementById('txMerchantProduct').textContent = (tx.customFields && (tx.customFields.iris_product || tx.customFields.irisProduct)) || '—';

    buildPaymentMethodRows(tx);
    buildTdsRows(tx);

    document.getElementById('rawPre').textContent = JSON.stringify(result, null, 2);
}
