import express from 'express';
import nocache from 'nocache';

import { query, keyScopeApp } from './db.mjs';
import { save } from './lyrics.mjs';

const router = express.Router();
router.use(nocache());

const access = (scope) => {
    return (req, res, next) => {
        if (!req.body.token) {
            return res.status(401).end();
        }
        keyScopeApp(req.body.token, scope)
            .then(([result]) => {
                if (result) {
                    console.log(`[${new Date().toISOString()}]<${req.ip}> (${result.app}) ${req.url}`);
                    next();
                } else {
                    res.status(401).end();
                }
            })
            .catch((error) => {
                console.error(error);
                res.status(500).end();
            });
    };
};

router.post('/lyrics', access('lyrics.read'), (_, res) => {
    query('SELECT * FROM songs WHERE deleted = 0 ORDER BY id ASC')
        .then((results) => {
            res.json(results);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).end();
        });
});

router.post('/delete', access('lyrics.write'), (req, res) => {
    query('UPDATE songs SET deleted = 1 WHERE id = ? AND deleted = 0', [req.body.id])
        .then((results) => {
            res.json({ deleted: !!results.affectedRows });
        })
});

router.post('/save', access('lyrics.write'), (req, res) => {
    save(req.body.song)
        .then((song) => {
            res.json({ song: song });
        })
        .catch((code) => {
            res.status(code).end();
        });
});

export { router }
