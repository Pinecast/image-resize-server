'use strict';

const https = require('https');

const express = require('express');
const sharp = require('sharp');


const app = express();


const SVG_MIME = 'image/svg+xml';
const validContentTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',

    SVG_MIME,
];

app.get('/resize', (req, res) => {
    if (!req.query.key) {
        console.error('No key found');
        res.status(400).send('no key');
        return;
    }
    const url = `https://pinecast-storage.s3.amazonaws.com/${req.query.key}`;
    let format = 'jpeg';
    switch (req.query.format) {
        // add more formats here
        case 'png':
            format = req.query.format;
    }

    console.log(`Resizing ${url} as ${format}`);
    const httpReq = https.get(url, httpRes => {
        if (httpRes.statusCode !== 200) {
            console.log('bad response');
            res.status(404).send('bad key');
            httpReq.abort();
            return;
        }

        if (validContentTypes.indexOf(httpRes.headers['content-type']) === -1) {
            res.status(403).send('bad content');
            httpReq.abort();
            return;
        }

        let content = Buffer.alloc(0);
        httpRes.on('data', d => {
            content = Buffer.concat([content, d], content.length + d.length);
        });
        httpRes.on('end', () => {
            if (httpRes.headers['content-type'] === SVG_MIME) {
                res.set('Content-Type', 'image/svg+xml');
                res.send(content);
                return;
            }
            sharp(content)
                .resize(
                    (req.query.w || 0) | 0,
                    (req.query.h || 0) | 0
                )
                .toFormat(sharp.format[format])
                .toBuffer()
                .then(data => {
                    res.set('Content-Type', 'image/jpeg');
                    res.send(data);
                })
                .catch(e => res.status(500).send('could not resize'));
        });
    }).on('error', e => {
        console.error(e);
        res.status(500).send('error fetching');
    });
});

app.listen(process.env.PORT || 3000);
