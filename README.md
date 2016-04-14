#soup_backup 2.0.0
by [Błażej Wolańczyk](https://github.com/Junikorn)


CMD tool for backing up availableAssets soup.io assets taken from soup RSS feed.
You can find RSS feed on soup.io in options > privacy > export (RSS).
If the RSS file won't download at first time (e.g. showing 504 Gateway Timeout) please retry

How to run:
 - install [node.js](http://nodejs.org) at least at version 4.4.3
 - open CMD/bash in this directory (on Windows: Shift + Right Click > Open Command Line Here)
 - write in command: node backup
 - you can add arguments presented below to the command:
   - -f=[relative path of soup rss feed] *(if feed file name different than soup.rss)*
   - -c=[number of concurrent downloads] *(default is 20, please keep it within reason, your bandwidth, file system and processor are the limit)*
   - -b=[relative path of backup directory] *(default is CWD/backup/)*
   - -yt *(download youtube videos present in feed)*

Tool can also be used as an Node module
 ```javascript
  var soupBackup = require('soup_backup');
  soupBackup({
    feedPath: '/home/soup/feed.rss',
    backupPath: '/home/soup/backup/'
  }).then(stats => {
    //do something
  });
 /**
  * @function soupBackup
  * @param {Object} options
  * @param {String} options.backupPath - absolute path to backup directory
  * @param {String} options.feedPath - absolute path to feed file
  * @param {Number} [options.concurrent=20] - number of concurrent downloads
  * @param {Boolean} [options.youtube=false] - flag for downloading youtube videos
  * @returns {Promise} promise resolving with statistics object
  */
 ```

The MIT License (MIT)

> Copyright (c) 2016 Błażej Wolańczyk
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
