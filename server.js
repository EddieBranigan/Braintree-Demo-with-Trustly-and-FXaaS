const express = require('express');
const https = require('https');
const fs = require('fs');
var path = require('path');
const app = express();
const port = 3000;
const checkout = require('./routes/checkout');
const { json, urlencoded } = require('body-parser');

app.use(json());
app.use(urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/checkout', checkout);
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'selection.html')))
app.get('/payment', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment.html')))
app.get('/review', (req, res) => res.sendFile(path.join(__dirname, 'public', 'review.html')))
app.listen(port, () => { console.log(`App listening on port ${port}`) })

module.exports = app;
