/*
 *	Model class to represent metrics for the 
 *  job of creating a single transcoded audio file
 *
 *  Authors: Josh Perry
 *  25 February 2019
 */

const STATE = Object.freeze({
    QUEUE:      'queued',
    RUN:        'running',
    STOP:       'stopped',
    COMPLETE:   'complete',
    ERROR:      'error',
    TIMEOUT:    'timeout'
});
const functionTimeout = 250000; // AWS limit with 15 % safety margin

class SessionMetrics {
    constructor() {
        this.startTime = new Date();
        this.state = STATE.QUEUE;
        
        // Default initializers
        this.endTime = null;
        this.durationMillis = 0;
        this.durationMins = 0;
        this.audioEncodingTime = 0;
        this.audioDownloadSuccessRate = 0;  
        this.downloadFailures = {};             // format {episodeUID: audioPath} - {< string >: < string >}
        this.error = null;

        // Set a timer to watch for timeout events
        this.initTimeout();
    }

    /*  --------------------------------------
     *              State Updates
     *  -------------------------------------- */

    startTask() { this.state = STATE.RUN }
    stopTask() { this.state = STATE.STOP }

    /*  --------------------------------------
     *              End Session
     *  -------------------------------------- */

    async endSessionSuccess(){
        clearTimeout(this.timer);
        this.state = STATE.COMPLETE;
        this.computeSessionEndMetrics();

        this.logSessionMetrics();
    }

    async endSessionWithError(error) {
        clearTimeout(this.timer);
        this.state = STATE.ERROR;
        this.computeSessionEndMetrics();
        this.error = error;

        this.logSessionMetrics();
    }

    initTimeout() {
        let self = this;
        self.timer = setTimeout(() => {
            console.warn(`SESSION: Timed out.`);
            self.state = STATE.TIMEOUT;
            
            // TODO: Stop Transcoding process if running
            self.computeSessionEndMetrics();
            self.logSessionMetrics();
        }, functionTimeout);
    }

    computeSessionEndMetrics() {
        this.endTime = new Date();
        this.durationMillis = this.endTime - this.startTime; 
        this.durationMins = Math.round((this.durationMillis/60000) * 100) / 100;
    }

    getMetrics() {
        return {
            state:                      this.state,
            audioEncodingTime:          this.audioEncodingTime,
            startTime:                  this.startTime,
            endTime:                    this.endTime,
            durationMillis:             this.durationMillis,
            durationMins:               this.durationMins,
            audioDownloadSuccessRate:   this.audioDownloadSuccessRate,
            downloadFailures:           this.downloadFailures,
            error:                      this.error
        };
    }

    /*  --------------------------------------
     *              Metric Updates
     *  -------------------------------------- */

    setDownloadSuccessRate(rate) {
        let ratePercent = rate * 100;
        this.audioDownloadSuccessRate = Math.round(ratePercent * 100) / 100;
    }

    addAudioFailureForDownload(audioDownload) {
        if (!audioDownload.isIntro) {
            this.downloadFailures[audioDownload.episodeUID] = audioDownload.downloadPath;
        } else {
            this.downloadFailures[`${audioDownload.episodeUID}_intro`] = audioDownload.audioPath;
        }
    }

    setEncodingTime(duration) {
        this.audioEncodingTime = Math.round((duration/1000) * 100) / 100;
    }

    logSessionMetrics() {
        let metrics = this.getMetrics();
        console.log(metrics);
    }
    
}

module.exports = SessionMetrics;