const Busboy = require('busboy');

function multipartParser(req, res, next) {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        const contentType = req.headers['content-type'];
        if (contentType && contentType.includes('multipart/form-data')) {
            try {
                const busboy = Busboy({ headers: req.headers });
                req.body = {};
                req.files = [];
                req.file = null;

                busboy.on('field', (fieldname, val) => {
                    req.body[fieldname] = val;
                });

                busboy.on('file', (fieldname, file, info) => {
                    const { filename, encoding, mimeType } = info;
                    const buffers = [];
                    
                    file.on('data', (data) => {
                        buffers.push(data);
                    });
                    
                    file.on('end', () => {
                        const buffer = Buffer.concat(buffers);
                        const fileObj = {
                            fieldname,
                            originalname: filename,
                            encoding,
                            mimetype: mimeType,
                            buffer: buffer,
                            size: buffer.length
                        };
                        req.files.push(fileObj);
                        if (!req.file) {
                            req.file = fileObj;
                        }
                    });
                });

                busboy.on('finish', () => {
                    next();
                });

                busboy.on('error', (err) => {
                    console.error('Busboy parsing error:', err);
                    next(err);
                });

                if (req.rawBody) {
                    busboy.end(req.rawBody);
                } else {
                    req.pipe(busboy);
                }
            } catch (err) {
                console.error('Busboy initialization error:', err);
                next(err);
            }
            return;
        }
    }
    next();
}

module.exports = multipartParser;
