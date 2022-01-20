require('colors');
const csv = require('csv-parser');
const fs = require('fs');
const rl = require('readline-sync');
const { sendNoReplyMail, MailtokenVerifed } = require('./util/mailHandler');
const { devMail } = require('./util/constants'); // eslint-disable-line no-unused-vars
const { htmlParser } = require('./util/html_parser');

/** @typedef {import('./types/model').Event} Event */

// ------------------CONFIGURATION-----------------------------
const debugMode = true;
const debugFolderPath = './data/temp'; // Default
const sendDevMail = false;

const subject = 'Certificates for Le Début';
const htmlPath = './temp/content.html';

const allParticipationEventName = 'Participants'; // Mandatory Event
const hasParticipantionCertificate = false;

const sendMail = false;
// ------------------END: CONFIGURATION-----------------------------

const showWarning = (batchFileListLocation) => {
    if (sendMail) {
        console.log(`You are about to send mails to everyone in ${batchFileListLocation}`.red.bold);
        return rl.keyInYN('Do you want to continue or abort');
    }
    return true;
};

/**
 * @param {Event[]} eventData
 */
const sendMailInvidualHandler = async (eventData) => {
    const html = htmlParser(htmlPath);
    const { data: participants } = eventData.find((e) => e.EventName === allParticipationEventName);

    let index = 0;
    const left = [];
    const debugData = [];

    for (const participant of participants) {
        const id = ++index;
        const { NAME: name, MAIL: email } = participant;
        const attachment = [];

        console.log(`${id}: Processing mail`.blue.bold, `${name} : ${participant.MAIL}`);

        eventData.forEach((currentEvent) => {
            // Check if participation certificate is there
            if (currentEvent.EventName === allParticipationEventName && !hasParticipantionCertificate) return;

            // Check if participant is part of current event
            const inCurrentEvent = currentEvent.data.find((person) => person.MAIL === participant.MAIL);
            if (!inCurrentEvent) return;

            // If participant is in current event, then attach the certficate
            const tempPath = `${currentEvent.DataDirectoryPath}/${name}.${currentEvent.FileType}`;
            if (!fs.existsSync(tempPath)) {
                console.error(`Not Found ${tempPath} | ${name} : ${email}`.red.bold);
            } else {
                attachment.push({
                    filename: `${currentEvent.CertificateName} Certificate.${currentEvent.FileType}`,
                    path: tempPath,
                });
            }
        });

        if (sendMail) left.push(sendNoReplyMail(participant.MAIL, subject, html, attachment, id));
        if (sendDevMail) left.push(sendNoReplyMail(devMail, subject, html, attachment, id));

        if (debugMode) {
            const data = {
                participant: participant.MAIL,
                attachment,
            };
            debugData.push(data);
        }
    }

    if (debugMode) {
        console.debug(`Generated mails.json at ${debugFolderPath}/mails.json`.yellow.bold);
        fs.writeFileSync(`${debugFolderPath}/mails.json`, JSON.stringify(debugData, null, 4));
    }
    await Promise.all(left);
};

async function csvParserSendIndividual() {
    /** @type {Event[]} */
    let eventData = await new Promise((resolve) => {
        const temp = [];
        fs.createReadStream('./data/events.csv')
            .pipe(csv())
            .on('data', (e) => {
                const EventName = e.EventName.trim();
                const CertificateName = e.CertificateName.trim();
                const FileType = e.FileType.trim();
                temp.push({
                    EventName,
                    CertificateName,
                    FileType,
                    FileName: `./data/CSV/${EventName}.csv`,
                    DataDirectoryPath: `./data/Certificates/${EventName}`,
                });
            })
            .on('end', () => resolve(temp));
    });

    eventData = eventData.map(async (eventObject) => {
        const results = [];
        const result = new Promise((resolve) => {
            fs.createReadStream(eventObject.FileName)
                .pipe(csv())
                .on('data', (e) =>
                    results.push({
                        NAME: e.NAME.trim(),
                        MAIL: e.MAIL.trim(),
                    })
                )
                .on('end', () => resolve(results));
        });
        return {
            ...eventObject,
            data: await result,
        };
    });

    eventData = await Promise.all(eventData);
    if (debugMode) {
        console.debug(`Generated events.json at ${debugFolderPath}/events.json`.yellow.bold);
        fs.writeFileSync(`${debugFolderPath}/events.json`, JSON.stringify(eventData, null, 4));
    }
    await sendMailInvidualHandler(eventData);
}

(async () => {
    await MailtokenVerifed;
    if (!showWarning()) return;
    await csvParserSendIndividual();
    console.log('Email Sending Done'.magenta.bold);
    process.exit(0);
})();
