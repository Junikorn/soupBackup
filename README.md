#soup_backup 1.0.3
by [Błażej Wolańczyk](https://github.com/Junikorn)


CMD tool for backing up available soup.io assets taken from soup RSS feed.
You can find RSS feed on soup.io in options > privacy > export (RSS).
If the RSS file won't download at first time (e.g. showing 504 Gateway Timeout) please retry

How to run:
 - install [node.js](http://nodejs.org) at least at version 4.4.3
 - open CMD/bash in this directory (on Windows: Shift + Right Click > Open Command Line Here)
 - write in command "node backup"
 - [optionally] after space write in file name if it is different from "soup.rss" (or rename your file)
 - [optionally] after space write in number of simultaneous downloads
     (default is 20, please keep it within reason, your bandwidth, file system and processor are the limit)

Tool can also be used as an Node module
 ```javascript
  var soupBackup = require('soup_backup');
  soupBackup('soup.rss').then(stats => {
    //do something
  });
 /**
  * @function soupBackup
  * @param {String} feedPath - absolute path of rss feed
  * @param {Number} [concurrent=20] - amount of concurrent downloads
  * @param {String} [backupPath=CWD+'/backup/'] - absolute path for backup directory
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
