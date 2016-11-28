const https = require('https');

const express = require('express');
const sharp = require('sharp');


const app = express();


const validContentTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
];

app.get('/resize', (req, res) => {
    if (!req.query.key) {
        res.status(400).end();
        return;
    }
    const url = `https://pinecast-storage.s3.amazonaws.com/${req.query.key}`;
    let format = 'jpeg';
    switch (req.query.format) {
        // add more formats here
        case 'png':
            format = req.query.format;
    }


    console.log(`Resizing ${url}`);
    const httpReq = https.get(url, httpRes => {
        if (httpRes.statusCode !== 200) {
            console.log('bad response');
            res.status(404).end();
            httpReq.abort();
            return;
        }

        if (validContentTypes.indexOf(httpRes.headers['content-type']) === -1) {
            res.status(403).end();
            httpReq.abort();
            return;
        }

        let content = Buffer.alloc(0);
        httpRes.on('data', d => {
            content = Buffer.concat([content, d], content.length + d.length);
        });
        httpRes.on('end', () => {
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
                .catch(e => res.status(500).end());
            // res.send();
        });
    }).on('error', e => {
        console.error(e);
        res.status(500).end();
    });
});

app.listen(process.env.PORT || 3000);