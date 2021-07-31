require('colors');
const csv = require('csv-parser');
const fs = require('fs');
// eslint-disable-next-line no-unused-vars
const { devMail, backendMail, MailtokenVerifed } = require('./util/constants');
const { sendNoReplyMail } = require('./util/mailHandler');

/** @typedef {import('./models/model').Event} Event */
/** @typedef {import('./models/model').Person} Person */

async function csvParse() {
    const html = fs.readFileSync('./temp/general.html', 'utf-8', () => {});

    const attachment = [
        {
            filename: 'logo.png',
            path: './temp/logo.png',
            cid: 'logo',
        },
    ];

    let id = 1;
    const toLeft = [];
    toLeft.push(sendNoReplyMail(devMail, 'Le Debut', html.replace('<#NAME>', 'Backend'), attachment, id++));

    // await new Promise((resolve) =>
    //     fs
    //         .createReadStream('./batch.csv')
    //         .pipe(csv())
    //         .on('data', (e) => {
    //             toLeft.push(sendNoReplyMail(devMail, 'R21 | Final Phase Results', html.replace('<#NAME>', e.NAME), attachment, id++));
    //             // toLeft.push(sendNoReplyMail(e.MAIL, 'R’21 | Final Phase Results', html.replace('<#NAME>', e.NAME), attachment, id++));
    //         })
    //         .on('end', () => {
    //             resolve();
    //         })
    // );

    await Promise.all(toLeft);
}

(async () => {
    await MailtokenVerifed;
    await csvParse();
    console.log('Email Sending Done'.magenta.bold);
    process.exit(0);
})();
