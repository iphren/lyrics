import pinyin from 'pinyin';
import { insert, query, update } from './db.mjs';

const toPinyin = (text) => {
    return pinyin(
        text
            .replace(/行/g, '形')
            .replace(/着/g, '这')
            .replace(/弹/g, '谈')
            .replace(/祢|袮/g, '你'),
        { style: pinyin.STYLE_NORMAL });
};

const cleanLyrics = (text) => {
    return text
        .replace(/祢|袮/g, '你')
        .replace(/祂/g, '他')
        .replace(/\[[^\]]*\]|［[^］]*］|【[^】]*】|\([^\)]*\)|（[^）]*）|<[^>]*>|《[^》]*》/g, '')
        .replace(/[<>《》\(\)（）&。，”“、！？\[\]【】；：]+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .replace(/^[^\S\r\n]+|[^\S\r\n]+$/gm, '')
        .replace(/[^\S\r\n]+/g, ' ')
        .replace(/\n\n+/g, '\n\n');
};

const save = (song, appId, weak = false) => {
    return new Promise(async (resolve, reject) => {
        song.title = cleanLyrics(song.title);
        song.lyrics = cleanLyrics(song.lyrics);
        if (typeof song.title === 'string'
            && typeof song.lyrics === 'string'
            && song.title.length > 0
            && song.lyrics.length > 0) {
            let baseId = toPinyin(song.title).map(p => p[0].toLowerCase()).join('').replace(/[^a-z0-9]/g, '');
            if (weak) {
                baseId += '-probation';
                if (song.songId) {
                    let results = await query('SELECT id FROM songs WHERE songId = ? AND deleted = 0', [song.songId]);
                    if (results && results.length && results[0].id.indexOf('-probation') == -1) {
                        delete song.songId;
                    }
                }
            }
            let repeat = 1;
            song.id = baseId;
            let results;
            while (!results) {
                try {
                    if (song.songId) {
                        results = await update('songs', song, 'songId');
                    } else {
                        results = await insert('songs', song);
                    }
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        song.id = `${baseId}-${++repeat}`;
                    } else {
                        console.error(error);
                        return reject(500);
                    }
                }
            }
            let keywords = '', initials = '';
            let py = toPinyin(`${song.title} ${song.lyrics}`);
            for (let p of py) {
                let plc = p[0].toLowerCase();
                keywords += plc.replace(/[^a-z0-9]/g, '');
                plc.split(/[^a-z0-9]/).forEach(s => {
                    let m = s.match(/[a-z0-9]/);
                    if (m) initials += m[0];
                });
            }
            song.keywords = song.id + initials + keywords;
            query('UPDATE songs SET keywords = ?, modifiedBy = ? WHERE id = ?', [song.keywords, appId, song.id])
                .then((results) => {
                    if (results.affectedRows) {
                        resolve(song);
                    } else {
                        reject(404);
                    }
                })
                .catch((error) => {
                    console.error(error);
                    reject(500);
                });
        } else {
            reject(400);
        }
    });
};

const weaksave = (song, appId) => save(song, appId, true);

export { toPinyin, cleanLyrics, save, weaksave }
