import * as http from 'node:http';
import * as https from 'https';
import * as unzipper from 'unzipper';
import * as fs from 'fs';
import * as path from 'path';

const downloadFile = async (fileUrl: string, zipPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        https.get(fileUrl, async (response: http.IncomingMessage) => {
            if (response.headers.location) {
                console.log(`Redirecting to: ${response.headers.location}`);
                await downloadFile(response.headers.location!, zipPath);
                resolve();
            } else if (response.statusCode === 200) {
                const file = fs.createWriteStream(zipPath);
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        console.log('Download completed!');
                        resolve();
                    });
                });
            } else {
                console.error(`Failed to download file: ${response.statusCode}`);
                reject();
            }
        }).on('error', (err: unknown) => {
            console.error(`Error: ${err}`);
            reject();
        });
    });
};

const extractToCache = (zipPath: string, bootstrapPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: bootstrapPath }))
            .on('close', () => {
                console.log('Extraction completed!');
                resolve();
            })
            .on('error', (err: unknown) => {
                console.error(`Error: ${err}`);
                reject();
            });
    });
};

const main = async () => {
    const cacheDir = process.argv[2];
    const outputDir = process.argv[3];
    const binaryUrl = process.argv[4];

    const bootstrapPath = path.join(cacheDir, 'bootstrap');
    const zipPath = path.join(cacheDir, 'llrt-lambda.zip');

    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    if (!fs.existsSync(bootstrapPath)) {
        await downloadFile(binaryUrl, zipPath);
        await extractToCache(zipPath, cacheDir);
        fs.unlinkSync(zipPath);
    }

    fs.copyFileSync(bootstrapPath, path.join(outputDir, 'bootstrap'));
}

main();
