/*
 *	Class to perform audio manipulations, such as concatenation, ducking and other effects
 *
 *  Author: Josh Perry
 *  25 February 2019
 */

// External imports
var fs = require('fs');
var cmd = require('node-cmd');

// Internal imports & constants
let AudioDownload = require('./audio_download');
let ffmpeg = require('ffmpeg-static');
let ffprobe = require('ffprobe-static');
let minDownloadIntegrity = 0.6;                         // 60% of files must download and stitch
let codec = 'mp3';                                      // If this changes to non-complient file ext, file naming needs to change
let bitrate = '128';
let audioTitle = 'Stitched Audio';
let transcodeTimeout = 180000;                          // 3 mins (2x ave transcode time)
let Constants = require('./../config/constants');
let Utilities = require('./../utilities/utilities');

class AudioManager {

    constructor(audioURLs, targetWriteStream, creationSession) {
        console.log(`AUDIO MANAGER: Initializing audio manager`);
        this.audioDownloads = audioURLs;
        this.successfulAudioDownloads = 0;

        this.writeStream = targetWriteStream;
        this.creationSession = creationSession;

        // Create audio downloads
        this.audioDownloads = [];
        for (let audioURL of audioURLs) {
            let audioDownload = new AudioDownload(audioURL);
            this.audioDownloads.push(audioDownload);
        }

        this.totalAudioDownloads = this.audioDownloads.length;
        console.log(`AUDIO MANAGER: Ready to download & stitch ${this.totalAudioDownloads} audio files`);
    }

    /* ---------------------------------------------------------
     * 
     *                     Audio Processing
     * 
     * --------------------------------------------------------- */

    async startAudioProcessing() {
        try {
            console.log(`AUDIO MANAGER: Starting radcast creation for user = ${this.radcast.userUID}`);
         
            // Start the stream-write process recursively - downloads audio files
            await self.downloadAudioPromiseWrapper()

            // Stitch audio
            console.log(`AUDIO MANAGER: Starting audio transcoding`);
            let localStitchedFile = await self.stitchDownloadedAudio();
                
            // Temp
            if (!this.writeStream) { return 'Successfully downloaded and stitched, but not uploaded' }

            // Write audio file to supplied writable stream
            let readStream = fs.createReadStream(localStitchedFile);
            readStream.pipe(this.writeStream);
            await this.endEventPromiseWrapper();
                
            // Need to delete stitched audio file in case instance gets reused 
            // (bash command waits for input on overwrite decision)
            Utilities.deleteFileSync(localStitchedFile); 
            return 'Successfully transcoded and stitched audio';
        }
        
        catch (error) {
            return error;
        }
    }

    // To improve readability of caller function *
    endEventPromiseWrapper(readStream) {
        return new Promise((resolve, reject) => {
            readStream.on('end', () => { return resolve() });
            readStream.on('error', (error) => { return reject(error)});
        });
    }

    downloadAudioPromiseWrapper() {
        return new Promise((resolve, reject) => {
            // Create shallow copy of the priorityKeys array to use in recursive function
            var self = this;

            // Recursive download method
            self.downloadAudioFiles(self, 0, function(success, error) {
                if (success === true) { return resolve() }
                else { return reject(error) }
            });
        });
    }

    /*
     *                                 Stream in Audio Files
     * 
     *      Recursive method to stream in the audio file's untill all are complete. Calls 
     *      completion callback with the radcast variable (containing the audio data) as 
     *      an argument
     *  
     */

    async downloadAudioFiles(self, index, completion) {
        if (index == self.totalAudioDownloads) {
            // We're all done!
            let successRate = self.successfulAudioDownloads/self.totalAudioDownloads;
            self.creationSession.setDownloadSuccessRate(successRate);

            if (successRate > minDownloadIntegrity) { 
                console.log(`AUDIO MANAGER: Completed audio file download - success rate = ${successRate * 100} %`);
                completion(true, null) 
            }
            else { 
                var downloadFailure = new Error(`AUDIO MANAGER: Failed download integrity test, success rate = ${successRate}.`);
                completion(false, downloadFailure); 
            }

            return;
        }

        // Download method encapsulated to download object
        try {
            let nextDownload = self.audioDownloads[i];
            await nextDownload.downloadAudio();
            self.successfulAudioDownloads ++;
            self.downloadAudioFiles(self, index + 1, completion);
        } 
        
        catch(error) {
            console.error(error);
            self.downloadAudioFiles(self, index + 1, completion);
        }
    }

    /*
     *                              Stitch Audio
     * 
     *      Method assumes audio files are all saved to the temp directory, 
     *      and their names come in with an array (in the correct order). 
     *      Uses ffmpeg command line tool via node.js cmd package
     *  
     */

    stitchDownloadedAudio() {
        return new Promise((resolve, reject) => {
            // Create array of temp audio file's to concat
            var self = this;
            let startTime = new Date();

            var audioFiles = [];
            for (let audioDownload of self.audioDownloads) {
                if (audioDownload.downloadSuccess === true) { audioFiles.push(audioDownload.tempFilePath) }
            }

            // Target file - full stitched audio
            let stitchedAudioFile = `${Constants.AUDIO_FILE_DIR}/${Constants.STITCHED_FILE}.${codec}`;
            let stitchFfmpegCommand = self.concatCmdWithReEncoding(audioFiles, stitchedAudioFile, codec, bitrate, {title: audioTitle});
            
            // Shell process vars
            self.transcodeTimer = null;

            let cmdRef = cmd.get(
                stitchFfmpegCommand,
                function(error, response, stdout) {
                    // Process completed, clear timer
                    clearTimeout(self.transcodeTimer);

                    if (error == null) {          
                        console.log(`AUDIO MANAGER: Audio transcoding complete`);
                        let fileStats = fs.statSync(stitchedAudioFile);
                        let fileSize = fileStats.size;
                        // .setAudioFileSize(fileSize);

                        // Log time
                        let endTime = new Date();
                        let encodingTime = endTime - startTime;
                        self.creationSession.setEncodingTime(encodingTime);
                        return resolve(stitchedAudioFile); 
                    }

                    else {
                        // Something went wrong
                        console.log(`AUDIO MANAGER: Failure to stitch audio - ${stdout}`);
                        let ffmpegError = new Error(stdout);
                        return reject(ffmpegError);
                    }
            });

            // Set a timeout in case transcoding fails - 2x ave transcode time
            self.transcodeTimer = setTimeout(function() {
                console.error(`AUDIO MANAGER: Transcoding timed out.`);
                cmdRef.kill();
            }, transcodeTimeout); 
        });
    }

     /*
     *                                 ffmpeg concat filter
     * 
     *      A full description of how and why this process is necessary is available in the 
     *      readme. In short, the function takes in a desired output codec, bit rate and title. 
     *      Using these it returns a command to concatenates input files, re-encoding them (which 
     *      is require for variable inout codecs and codec parameters) and producing a single 
     *      output file.
     *  
     */

    concatCmdWithReEncoding(inputFiles, outputFile, outputCodec, outputBitrate, trackMetadata) {
        var concatCmd = ffmpeg.path;

        // Loop through add inputs
        for(var i in inputFiles) {
            let file = inputFiles[i];
            concatCmd += ` -i ${file}`;
        }

        // add filter + arguments
        concatCmd += ` -filter_complex "`;
        for (var k = 0; k < inputFiles.length; k++) {
            concatCmd += `[${k}:0]`;
        }
        concatCmd+= `concat=n=${inputFiles.length}:v=0:a=1[output]"`;

        // Add output parameters & metadata
        concatCmd += ` -map [output] -map_metadata -1 -c:a ${outputCodec} -b:a ${outputBitrate}k -metadata`;
        for(var metaKey in trackMetadata) {
            let metaValue = trackMetadata[metaKey];
            concatCmd += ` ${metaKey}="${metaValue}"`;
        }
        concatCmd += ` ${outputFile}`
        return concatCmd;
    }

    getAudioDuration(file) {
        return new Promise((resolve, reject) => {
            // Constructor string
            let formatCmd =  ffprobe.path + ` -i ${file} -show_entries format=duration -v quiet -of csv="p=0"`;

            cmd.get(
                formatCmd,
                function(error, data, stdout) {
                    if(error == null) {
                        let duration = Number(data);
                        return resolve(duration);
                    }

                    else {
                        console.error(`AUDIO MANAGER: Duration estimation failure`);
                        let durationError = new Error(stdout);
                        return reject(durationError);
                    }
                }
            );
        });
    }
}

module.exports = AudioManager;

















