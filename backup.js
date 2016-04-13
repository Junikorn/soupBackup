'use strict';

/**
 * @author Błażej Wolańczyk <https://github.com/Junikorn>
 * @name soup_backup
 * @version 1.0.3
 *
 * CMD tool for backing up available soup.io assets taken from soup RSS feed
 * You can find RSS feed on soup.io in options > privacy > export (RSS)
 * If the RSS file won't download at first time (e.g. showing 504 Gateway Timeout) please retry
 *
 * How to run:
 *  - install node.js (http://nodejs.org) at least at version 4.4.3
 *  - open CMD/bash in this directory (on Windows: Shift + Right Click > Open Command Line Here)
 *  - write in command "node backup"
 *  - [optionally] after space write in file name if it is different from "soup.rss" (or rename your file)
 *  - [optionally] after space write in number of simultaneous downloads 
 *      (default is 20, please keep it within reason, your bandwidth, file system and processor are the limit)
 *
 * Tool can also be used as an Node module
 * @function run
 * @param {String} feedPath - absolute path of rss feed
 * @param {Number} [concurrent=20] - amount of concurrent downloads
 * @param {String} [backupPath=CWD+'/backup/'] - absolute path for backup directory
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
    ytdl = require('ytdl-core'),
    youtubeRE = /youtube\.com|youtu\.be/i,
    ytOptions = { filter: function(format) {
        return format.container === 'mp4' && format.audioBitrate && format.bitrate;
    } };

function run(feedPath, concurrent, backupPath){
    var cfg = (typeof(feedPath) === 'string') ? {
        feedPath: feedPath
    } : feedPath;
    cfg.concurrent = concurrent;
    cfg.backupPath = backupPath;
    return new Promise(resolve => {
        install()
            .then(() => {
                return {
                    available: 0,
                    availableVideos: 0,
                    backupPath: path.normalize(cfg.backupPath || process.cwd() + '/backup/'),
                    concurrent: cfg.concurrent || 20,
                    downloaded: 0,
                    feedPath: path.normalize(cfg.feedPath),
                    promises: [],
                    resolve: resolve,
                    videos: 0,
                    youtube: cfg.youtube || false
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

function ensureDirectory(path){
    return new Promise(resolve => {
        fs.access(path, fs.R_OK | fs.W_OK, err => {
            if(err && err.code === 'ENOENT'){
                log('creating backup directory', path);
                fs.mkdir(path, err => {
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
            cfg.available++;
            var url = item.enclosure.$.url,
                filePath = cfg.backupPath + path.basename(url);
            fs.access(filePath, fs.R_OK, err => {
                if(err && err.code === 'ENOENT'){
                    var file = fs.createWriteStream(filePath);
                    http.get(url, response => {
                        response.pipe(file);
                        response.on('end', () => {
                            cfg.downloaded++;
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
                                    cfg.videos++;
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
                log('found', cfg.available, 'available assets');
                log('downloaded', cfg.downloaded, 'new assets');
                if(cfg.youtube){
                    log('found', cfg.availableVideos, 'available videos');
                    log('downloaded', cfg.videos, 'new videos');
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

if(!module.parent){
    console.log('Soup Backup by Błażej Wolańczyk (c) 2016');
    run({
        concurrent: process.argv[3] ? +process.argv[3] : undefined,
        feedPath: __dirname + '/' + (process.argv[2] || 'soup.rss'),
        youtube: true
    }).then(() => process.exit());
}else{
    module.exports = run;
}