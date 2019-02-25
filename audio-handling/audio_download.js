/*
 *	Model class to represent a downloadable element for an audio file 
 *  Primary reason to use is to differentiate between episodes audio and intro audio
 * 
 *  Authors: Josh Perry & Yoda Scholtz
 *  Copyright Roosta Media 2018 
 */

let axios = require('axios');
let fs = require('fs');
let Constants = require('./../config/constants');
let Utilities = require('./../utilities/utilities');

class AudioDownload {
    constructor(audioURL) {
        this.downloadSuccess = false;
        this.duration = null;
        this.tempAudioFileDir = `${Constants.AUDIO_FILE_DIR}/downloads`;
        this.downloadURL = audioURL;

        // Create unique file path
        let pathComponents = audioPath.split(".");
        let fileExt = pathComponents[pathComponents.length - 1];
        let fileUID = Utilities.createUID();
        this.tempFile = `${fileUID}.${fileExt}`
        this.tempFilePath = `${this.tempAudioFileDir}/${this.tempFile}`;

        this.createDirs();
    }

    createDirs() {
        if(!fs.existsSync(this.tempAudioFileDir)){
            fs.mkdirSync(this.tempAudioFileDir);
        } 
    }

    // Downloading
    async downloadAudio() {
        console.log(`AUDIO DOWNLOAD: Attempting to download ${this.fileUID}`);
        let writeStream = fs.createWriteStream(this.tempFilePath);

        // Pipe the download to the path
        axios({
                method:'get',
                url: this.downloadURL,
                responseType:'stream'
            })
            .then(res => {
                res.data.pipe(writeStream);
                res.on('end', () => {
                    console.log(`AUDIO DOWNLOAD: Completed download`);
                    this.downloadSuccess = true;
                    return true;
                });
            })
            
            .catch(error => { throw error });
    }
 }

 module.exports = AudioDownload;
