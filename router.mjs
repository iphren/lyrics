import axios from 'axios';
import express from 'express';
import nocache from 'nocache';
import dotenv from 'dotenv';
dotenv.config();

import { query, keyScopeApp, addPlaylist } from './db.mjs';
import { save, weaksave } from './lyrics.mjs';

const router = express.Router();
router.use(nocache());

const access = (scope, redirect = undefined) => {
    return (req, res, next) => {
        let apiKey;
        switch (req.method) {
            case 'PUT':
            case 'PATCH':
            case 'POST':
                apiKey = req.body.token;
                break;
            default:
                apiKey = req.query.key;
                break;
        }
        if (!apiKey) {
            console.log(`[${new Date().toISOString()}]<${req.ip}> #DENIED# ${req.method} ${req.url}`);
            return res.status(401).end();
        }
        keyScopeApp(apiKey, scope)
            .then(([result]) => {
                if (result) {
                    console.log(`[${new Date().toISOString()}]<${req.ip}> (${result.app}) ${req.method} ${req.url}`);
                    next();
                } else if (typeof redirect === 'string') {
                    console.log(`[${new Date().toISOString()}]<${req.ip}> #REDIRECT# ${req.method} ${req.url} -> ${redirect}`);
                    res.redirect(307, redirect);
                } else {
                    console.log(`[${new Date().toISOString()}]<${req.ip}> #DENIED# ${req.method} ${req.url}`);
                    res.status(401).end();
                }
            })
            .catch((error) => {
                console.error(error);
                res.status(500).end();
            });
    };
};

const sanitize = (param, pathogen) => {
    return (req, res, next) => {
        req.params[param] = req.params[param].replace(pathogen, '');
        next();
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

router.post('/delete', access('lyrics.write', 'weakdelete'), (req, res) => {
    query('UPDATE songs SET deleted = 1 WHERE id = ? AND deleted = 0', [req.body.id])
        .then((results) => {
            res.json({ deleted: !!results.affectedRows });
        })
});

router.post('/weakdelete', access('playlist.read'), (req, res) =>{
    if (req.body.id.indexOf('-probation') > -1) {
        query('UPDATE songs SET deleted = 1 WHERE id = ? AND deleted = 0', [req.body.id])
            .then((results) => {
                res.json({ deleted: !!results.affectedRows });
            });
    } else {
        console.log(`[${new Date().toISOString()}]<${req.ip}> #DENIED# ${req.method} ${req.url}`);
        res.status(401).end();
    }
});

router.post('/save', access('lyrics.write', 'weaksave'), (req, res) => {
    save(req.body.song)
        .then((song) => {
            res.json({ song: song });
        })
        .catch((code) => {
            res.status(code).end();
        });
});

router.post('/weaksave', access('playlist.read'), (req, res) =>{
    weaksave(req.body.song)
        .then((song) => {
            res.json({ song: song });
        })
        .catch((code) => {
            res.status(code).end();
        });
});

router.post(
    '/playlist/:part',
    access('playlist.write'),
    sanitize('part', /[^a-z]/g),
    async (req, res) => {
        try {
            let response = await axios.get(process.env.SERVICEURL);
            let event = response.data;
            let playlistId = await addPlaylist(req.body.playlist);
            await query(`UPDATE events SET \`${req.params.part}Playlist\` = ? WHERE id = ?`, [playlistId, event.id]);
            res.end();
        } catch (error) {
            console.error(error);
            res.status(500).end();
        }
    }
);

router.get(
    '/playlist/:part',
    //access('playlist.read'),
    sanitize('part', /[^a-z]/g),
    async (req, res) => {
        try {
            let response = await axios.get(process.env.SERVICEURL);
            let playlistId = response.data[req.params.part + 'Playlist'];
            if (!playlistId) {
                return res.json([]);
            }
            let playlist = await query('SELECT s.* FROM songs s INNER JOIN playlistItems pI on s.songId = pI.songId WHERE pI.playlistId = ?', [playlistId]);
            res.json(playlist);
        } catch (error) {
            console.error(error);
            res.status(500).end();
        }
    }
);

router.get(
    '/playlists/:id',
    //access('playlist.read'),
    async (req, res) => {
        query('SELECT s.* FROM songs s INNER JOIN playlistItems pI on s.songId = pI.songId WHERE pI.playlistId = ?', [req.params.id])
            .then((playlist) => {
                res.json(playlist);
            })
            .catch((error) => {
                console.error(error);
                res.status(500).end();
            });
    }
);

export { router }
