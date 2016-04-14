'use strict';

/**
 * @author Błażej Wolańczyk <https://github.com/Junikorn>
 * @name soup_backup
 * @version 2.0.1
 *
 * CMD tool for backing up available soup.io assets taken from soup RSS feed
 * You can find RSS feed on soup.io in options > privacy > export (RSS)
 * If the RSS file won't download at first time (e.g. showing 504 Gateway Timeout) please retry
 *
 * How to run:
 *  - install node.js (http://nodejs.org) at least at version 4.4.3
 *  - open CMD/bash in this directory (on Windows: Shift + Right Click > Open Command Line Here)
 *  - write in command "node backup"
 *  - you can add arguments presented below to the command:
 *    - -f=[relative path of soup rss feed] *(if feed file name different than soup.rss)*
 *    - -c=[number of concurrent downloads] *(default is 20, please keep it within reason, your bandwidth, file system and processor are the limit)*
 *    - -b=[relative path of backup directory] *(default is CWD/backup/)*
 *    - -yt *(download youtube videos present in feed)*
 *
 *
 * Tool can also be used as an Node module
 * @function run
 * @param {Object} options
 * @param {String} options.backupPath - absolute path to backup directory
 * @param {String} options.feedPath - absolute path to feed file
 * @param {Number} [options.concurrent=20] - number of concurrent downloads
 * @param {Boolean} [options.youtube=false] - flag for downloading youtube videos
 * @returns {Promise} promise resolving with statistics object
 *
 * @license
 * The MIT License (MIT)
 * Copyright (c) 2016 Błażej Wolańczyk
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var fs = require('fs'),
    http = require('http'),
    path = require('path'),
    youtubeRE = /youtube\.com|youtu\.be/i,
    ytOptions = { filter: function(format) {
        return format.container === 'mp4' && format.audioBitrate && format.bitrate;
    } },
    ytdl;

function run(options){
    return new Promise(resolve => {
        install()
            .then(() => {
                return {
                    availableAssets: 0,
                    availableVideos: 0,
                    backupPath: path.normalize(options.backupPath),
                    concurrent: +options.concurrent || 20,
                    downloadedAssets: 0,
                    downloadedVideos: 0,
                    feedPath: path.normalize(options.feedPath),
                    promises: [],
                    resolve: resolve,
                    youtube: options.youtube || false
                };
            })
            .then(checkWriteSpace)
            .then(readFeed)
            .then(initConcurrent);
    });
}

function install(){
    return new Promise(resolve => {
        fs.access(__dirname + '/node_modules', fs.R_OK, err => {
            if(err && !module.parent) {
                log('installing dependencies');
                require('child_process').exec('npm install', err => {
                    if (err) throw err;
                    resolve();
                });
            }else if(err){
                throw err;
            }else{
                resolve();
            }
        });
    });
}

function checkWriteSpace(cfg){
    return Promise.resolve()
        .then(() => ensureDirectory(cfg.backupPath))
        .then(() => ensureDirectory(cfg.backupPath + 'video/'))
        .then(() => cfg);
}

function ensureDirectory(dirPath){
    return new Promise(resolve => {
        dirPath = path.normalize(dirPath);
        fs.access(dirPath, fs.R_OK | fs.W_OK, err => {
            if(err && err.code === 'ENOENT'){
                log('creating backup directory', dirPath);
                fs.mkdir(dirPath, err => {
                    if(err) throw err;
                    resolve();
                });
            }else if(err) {
                throw err;
            }else{
                resolve();
            }
        });
    });
}

function readFeed(cfg){
    return new Promise(resolve => {
        fs.readFile(cfg.feedPath, function (err, data) {
            if(err){
                if(err.code === 'ENOENT'){
                    log('no feed found at path', cfg.feedPath);
                }
                throw err;
            }
            new require('xml2js').Parser({
                explicitArray: false
            }).parseString(data, (err, result) => {
                if (err) throw err;
                cfg.items = result.rss.channel.item;
                resolve(cfg);
            });
        });
    });
}

function initConcurrent(cfg){
    if(cfg.youtube){
        ytdl = require('ytdl-core');
    }
    cfg.total = cfg.items.length;
    log(cfg.total, 'entries to process');
    for(var i =0; i < cfg.concurrent; i++){
        processEntry(cfg);
    }
}

function processEntry(cfg){
    var items = cfg.items;
    if(items.length && items.length % 100 === 0){
        log(items.length, 'entries left');
    }
    var item = items.shift();
    if(item){
        var promise = downloadEntry(item, cfg);
        cfg.promises.push(promise);
        promise.then(processEntry);
    }else{
        exit(cfg);
    }
}

function downloadEntry(item, cfg){
    return new Promise(resolve => {
        if(item.enclosure){
            cfg.availableAssets++;
            var url = item.enclosure.$.url,
                filePath = cfg.backupPath + path.basename(url);
            fs.access(filePath, fs.R_OK, err => {
                if(err && err.code === 'ENOENT'){
                    var file = fs.createWriteStream(filePath);
                    http.get(url, response => {
                        response.pipe(file);
                        response.on('end', () => {
                            cfg.downloadedAssets++;
                            resolve(cfg);
                        });
                    }).on('error', () => resolve(cfg));
                }else{
                    resolve(cfg);
                }
            });
        }else{
            var metadata = JSON.parse(item['soup:attributes']);
            if(cfg.youtube && metadata.type === 'video' && youtubeRE.test(metadata.source)){
                ytdl.getInfo(metadata.source, (err, info) => {
                    if(err) return resolve(cfg);
                    var filePath = [cfg.backupPath, 'video/', info.video_id, '.mp4'].join('');
                    cfg.availableVideos++;
                    fs.access(filePath, fs.R_OK, err => {
                        if(err && err.code === 'ENOENT'){
                            log('downloading video', info.video_id);
                            ytdl.downloadFromInfo(info, ytOptions)
                                .pipe(fs.createWriteStream(filePath))
                                .on('finish', () => {
                                    cfg.downloadedVideos++;
                                    resolve(cfg);
                                }).on('close', () => resolve(cfg));
                        }else{
                            resolve(cfg);
                        }
                    });
                });
            }else{
                resolve(cfg);
            }
        }
    });
}

function exit(cfg){
    if(!cfg.finished){
        cfg.finished = true;
        Promise.all(cfg.promises)
            .then(() => {
                log('processed', cfg.total, 'entries');
                log('found', cfg.availableAssets, 'available assets');
                log('downloaded', cfg.downloadedAssets, 'new assets');
                if(cfg.youtube){
                    log('found', cfg.availableVideos, 'available videos');
                    log('downloaded', cfg.downloadedVideos, 'new videos');
                }
                log('backup saved in', cfg.backupPath);
                var resolve = cfg.resolve;
                delete cfg.items;
                delete cfg.promises;
                delete cfg.resolve;
                resolve(cfg);
            });
    }
}

function log(){
    if(!module.parent){
        console.log(new Date().toLocaleTimeString(), ...arguments);
    }
}

//export or parsing args and run

var mapping = {
        b: 'backupPath',
        c: 'concurrent',
        f: 'feedPath',
        yt: 'youtube'
    },
    quotesRE = /"([^"]+)"/i,
    argRE = /^-([^\s=]+)=([^\s]+)/i,
    boolArgRE = /^-([^\s=]+)$/i;

if(!module.parent){
    console.log('Soup Backup 2.0.1 by Błażej Wolańczyk (c) 2016');
    var options = {};
    process.argv.forEach(arg => {
        if(argRE.test(arg)){
            let match = arg.match(argRE),
                name = match[1],
                value = match[2];
            value = quotesRE.test(value) ? value.match(quotesRE)[1] : value;
            options[mapping[name] ? mapping[name] : name] = value;
        }else if(boolArgRE.test(arg)){
            let match = arg.match(boolArgRE),
                name = match[1];
            options[mapping[name] ? mapping[name] : name] = true;
        }
    });
    options.feedPath = options.feedPath ?
        process.cwd() + '/' + options.feedPath :
        process.cwd() + '/soup.rss';
    options.backupPath = options.backupPath ?
        process.cwd() + '/' + options.backupPath :
        process.cwd() + '/backup/';
    run(options).then(() => process.exit());
}else{
    module.exports = run;
}