import React, { Component } from 'react';
import Video from 'react-native-video';
import {
    TouchableWithoutFeedback,
    TouchableHighlight,
    ImageBackground,
    TouchableOpacity,
    PanResponder,
    StyleSheet,
    Animated,
    SafeAreaView,
    Easing,
    Image,
    View,
    Text,
    Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {ActivityIndicator} from 'react-native';
import convertToProxyURL from 'react-native-video-cache';
import Orientation from 'react-native-orientation-locker';

const screenHeight = Dimensions.get('screen').height;
const screenWidth = Dimensions.get('screen').width;
const screen = Dimensions.get('window');
export default class VideoPlayer extends Component {
    static defaultProps = {
        toggleResizeModeOnFullscreen: true,
        controlAnimationTiming: 500,
        doubleTapTime: 200,
        playInBackground: false,
        playWhenInactive: false,
        resizeMode: 'contain',
        isFullscreen: false,
        showOnStart: true,
        repeat: false,
        muted: false,
        volume: 1,
        title: '',
        rate: 1,
    };

    constructor(props) {
        super(props);

        /**
         * All of our values that are updated by the
         * methods and listeners in this class
         */
        this.state = {
            // Video
            resizeMode: this.props.resizeMode,
            paused: false,
            muted: this.props.muted,
            volume: this.props.volume,
            rate: this.props.rate,
            thumbnail: this.props.thumbnail,
            // Controls

            isFullscreen: this.props.isFullScreen,
            showTimeRemaining: true,
            volumeTrackWidth: 0,
            volumeFillWidth: 0,
            seekerFillWidth: 0,
            showControls: this.props.showOnStart,
            volumePosition: 0,
            seekerPosition: 0,
            volumeOffset: 0,
            seekerOffset: 0,
            seeking: false,
            originallyPaused: false,
            scrubbing: false,
            loading: false,
            currentTime: 0,
            playableDuration: 0,
            error: false,
            duration: 0,
            player: true,
            source: this.props.source,
            opacity: 0,
            rangeHeader: 'bytes=0-',
            //videoSize: 28253301,
            useNativeControls: true,
            controlHiddenAnimationFinished: false,
        };

        /**
         * Any options that can be set at init.
         */
        this.opts = {
            playWhenInactive: this.props.playWhenInactive,
            playInBackground: this.props.playInBackground,
            repeat: this.props.repeat,
            title: this.props.title,
        };

        /**
         * Our app listeners and associated methods
         */
        this.events = {
            onError: this.props.onError || this._onError.bind(this),
            onBack: this.props.onBack || this._onBack.bind(this),
            onEnd: this.props.onEnd || this._onEnd.bind(this),
            onScreenTouch: this._onScreenTouch.bind(this),
            onEnterFullscreen: this.props.onEnterFullscreen,
            onExitFullscreen: this.props.onExitFullscreen,
            onShowControls: this.props.onShowControls,
            onHideControls: this.props.onHideControls,
            onLoadStart: this._onLoadStart.bind(this),
            onProgress: this._onProgress.bind(this),
            onSeek: this._onSeek.bind(this),
            onLoad: this._onLoad.bind(this),
            onPause: this.props.onPause,
            onPlay: this.props.onPlay,
            //CUSTOM ADDED BY RAY
            onLeftScreenTouch: this._onLeftScreenTouch.bind(this),
            onRightScreenTouch: this._onRightScreenTouch.bind(this),
        };

        /**
         * Functions used throughout the application
         */
        this.methods = {
            toggleFullscreen: this._toggleFullscreen.bind(this),
            togglePlayPause: this._togglePlayPause.bind(this),
            toggleControls: this._toggleControls.bind(this),
            toggleTimer: this._toggleTimer.bind(this),
        };

        /**
         * Player information
         */
        this.player = {
            controlTimeoutDelay: this.props.controlTimeout || 15000,
            volumePanResponder: PanResponder,
            seekPanResponder: PanResponder,
            controlTimeout: null,
            tapActionTimeout: null,
            volumeWidth: 150,
            iconOffset: 0,
            seekerWidth: 0,
            ref: Video,
            scrubbingTimeStep: this.props.scrubbing || 0,
            tapAnywhereToPause: this.props.tapAnywhereToPause,
        };

        /**
         * Various animations
         */
        const initialValue = this.props.showOnStart ? 1 : 0;

        this.animations = {
            bottomControl: {
                marginBottom: new Animated.Value(0),
                paddingBottom: new Animated.Value(20),
                opacity: new Animated.Value(initialValue),
            },
            topControl: {
                marginTop: new Animated.Value(0),
                opacity: new Animated.Value(initialValue),
            },
            video: {
                opacity: new Animated.Value(1),
            },
            loader: {
                rotate: new Animated.Value(0),
                MAX_VALUE: 360,
            },
            controlStyle: {
                opacity: new Animated.Value(0.3),
            },
            skipNext: {
                opacity: new Animated.Value(0),
            },
            skipPrev: {
                opacity: new Animated.Value(0),
            },
        };

        /**
         * Various styles that be added...
         */
        this.styles = {
            videoStyle: this.props.videoStyle || {},
            containerStyle: this.props.style || {},
        };
    }

    componentWillReceiveProps(nextProps) {

        this.setState({
            paused: nextProps.paused,
        });
    }

    /**
      | -------------------------------------------------------
      | Events
      | -------------------------------------------------------
      |
      | These are the events that the <Video> component uses
      | and can be overridden by assigning it as a prop.
      | It is suggested that you override onEnd.
      |
      */

    /**
     * When load starts we display a loading icon
     * and show the controls.
     */
    _onLoadStart() {
        seekTo();
        let state = this.state;
        state.loading = true;
        this.loadAnimation();
        this.setState(state);

        if (typeof this.props.onLoadStart === 'function') {
            this.props.onLoadStart(...arguments);
        }
    }

    /**
     * When load is finished we hide the load icon
     * and hide the controls. We also set the
     * video duration.
     *
     * @param {object} data The video meta data
     */
    _onLoad(data = {}) {
        // console.log(data);
        let state = this.state;
        // console.log(`onLoad: paused=${state.paused}`);

        state.duration = data.duration;
        state.loading = false;
        this.setState(state);

        if (state.showControls) {
            this.setControlTimeout();
        }

        if (typeof this.props.onLoad === 'function') {
            this.props.onLoad(...arguments);
        }

        this.setState({opacity: 1});
    }

    /**
     * For onprogress we fire listeners that
     * update our seekbar and timer.
     *
     * @param {object} data The video meta data
     */
    _onProgress(data = {}) {
        console.log(data.playableDuration + "|" + data.currentTime);
        // console.log(this.state.progress + "|" + data.progress)
        let state = this.state;
        // console.log(`onprogress: paused=${state.paused}`);
        if (!state.scrubbing) {
            state.playableDuration = data.playableDuration
            if((state.currentTime - data.currentTime) > 1){
                console.log(`data.currentTime < state.currentTime (onProgress) ${data.currentTime}/${state.currentTime}`);
            }

            state.currentTime = data.currentTime;

            //CALCULATE RANGE HEADER
            //console.log(`currentTime = ${data.currentTime}, videoSize = ${state.videoSize}, playableDuration = ${data.playableDuration}`);
            //if (data.playableDuration != 0){
            //    range = Math.floor(data.currentTime * state.videoSize / data.playableDuration);
            //    rangeHeader = `bytes=${range}-`;
            //    console.log(`rangeHeader = ${rangeHeader}`);
            //    state.rangeHeader = rangeHeader;
            //}

            if (!state.seeking) {
                const position = this.calculateSeekerPosition();
                this.setSeekerPosition(position);
            }

            if (typeof this.props.onProgress === 'function') {orianteatn
                this.props.onProgress(...arguments);
            }

            this.setState(state);
        }
    }

    /**
     * For onSeek we clear scrubbing if set.
     *
     * @param {object} data The video meta data
     */
    _onSeek(data = {}) {
        console.log(`onSeek ${data.currentTime}`);
        let state = this.state;
        if (state.scrubbing) {
            // console.log("scrubbing")
            state.scrubbing = false;
            // if(data.currentTime < state.currentTime){
            //     console.log("data.currentTime < state.currentTime (onSeek)");
            // }
            state.currentTime = data.currentTime;

            // Seeking may be false here if the user released the seek bar while the player was still processing
            // the last seek command. In this case, perform the steps that have been postponed.
            if (!state.seeking) {
                this.setControlTimeout();
                state.paused = state.originallyPaused;
                // console.log(`onSeek: paused=${state.paused}`);
            }

            this.setState(state);
        }
    }

    /**
     * It is suggested that you override this
     * command so your app knows what to do.
     * Either close the video or go to a
     * new page.
     */
    _onEnd() { }

    /**
     * Set the error state to true which then
     * changes our renderError function
     *
     * @param {object} err  Err obj returned from <Video> component
     */
    _onError(err) {
        console.log(err);
        let state = this.state;
        state.error = true;
        state.loading = false;

        this.setState(state);
    }

    /**
     * This is a single and double tap listener
     * when the user taps the screen anywhere.
     * One tap toggles controls and/or toggles pause,
     * two toggles fullscreen mode.
     */
    _onScreenTouch(screenSideTouched) {
        // console.log('Video container touched');
        // console.log(`Start tapActionTimeout=${this.player.tapActionTimeout}`);
        if (this.player.tapActionTimeout) { //DOUBLE TAP
            clearTimeout(this.player.tapActionTimeout);
            this.player.tapActionTimeout = 0;
            if (screenSideTouched == "left") {
                this.onSkipPrevAnimation();
                let state = this.state;
                let seekTime = state.currentTime - 10;
                seekTime = seekTime < 0 ? 0 : seekTime;
                if(this.state.paused){
                    this.setSeekerPosition(this.calculateSeekerPositionFromTime(seekTime)); //UPDATE SEEKBAR POSITION
                    state.currentTime = seekTime;
                    this.setState(state);
                }

                console.log(`seeking to ${seekTime}`);
                this.player.ref.seek(seekTime);
            }
            else if (screenSideTouched == "right") {
                this.onSkipNextAnimation();
                let state = this.state;
                let seekTime = state.currentTime + 10;
                seekTime = seekTime > state.duration ? state.duration : seekTime;
                if(this.state.paused){
                    this.setSeekerPosition(this.calculateSeekerPositionFromTime(seekTime)); //UPDATE SEEKBAR POSITION
                    state.currentTime = seekTime;
                    this.setState(state);
                }

                console.log(`seeking to ${seekTime}`);
                this.player.ref.seek(seekTime);
            }
            else{
                // this.methods.toggleFullscreen();
            }
            const state = this.state;
            if (state.showControls) {
                this.resetControlTimeout();
            }
            // console.log(`If tapActionTimeout=${this.player.tapActionTimeout}`);
        } 
        else { //SINGLE TAP
            //THIS CALL IS ASYNC
            this.player.tapActionTimeout = setTimeout(() => {
                const state = this.state;
                if (this.player.tapAnywhereToPause && state.showControls) {
                    // console.log('resetControlTimeout')
                    this.methods.togglePlayPause();
                    this.resetControlTimeout();
                } else {
                    // console.log('toggleControls')
                    this.methods.toggleControls();
                }

                // console.log(`Else (1) tapActionTimeout=${this.player.tapActionTimeout}`);
                this.player.tapActionTimeout = 0; //RESET TAPACTIONTIMEOUT TO 0 AFTER FINISHED
                // console.log(`Else (2) tapActionTimeout=${this.player.tapActionTimeout}`);
            }, this.props.doubleTapTime);
            // console.log(`doubleTapTime=${this.props.doubleTapTime}`);
        }
    }

    _onLeftScreenTouch = () => {
        // console.log("left side touched");
        this._onScreenTouch("left");
    };
    
    _onRightScreenTouch = () => {
        // console.log("right side touched");
        this._onScreenTouch("right");
    };

    /**
      | -------------------------------------------------------
      | Methods
      | -------------------------------------------------------
      |
      | These are all of our functions that interact with
      | various parts of the class. Anything from
      | calculating time remaining in a video
      | to handling control operations.
      |
      */

    /**
     * Set a timeout when the controls are shown
     * that hides them after a length of time.
     * Default is 15s
     */
    setControlTimeout() {
        this.player.controlTimeout = setTimeout(() => {
            this._hideControls();
        }, this.player.controlTimeoutDelay);
    }

    /**
     * Clear the hide controls timeout.
     */
    clearControlTimeout() {
        clearTimeout(this.player.controlTimeout);
    }

    /**
     * Reset the timer completely
     */
    resetControlTimeout() {
        this.clearControlTimeout();
        this.setControlTimeout();
    }

    /**
     * Animation to hide controls. We fade the
     * display to 0 then move them off the
     * screen so they're not interactable
     */
    hideControlAnimation() {
        Animated.parallel([
            Animated.timing(this.animations.topControl.opacity, {
                toValue: 0,
                duration: this.props.controlAnimationTiming,
                useNativeDriver: false,
            }),
            Animated.timing(this.animations.topControl.marginTop, {
                toValue: -100,
                duration: this.props.controlAnimationTiming,
                useNativeDriver: false,
            }),
            Animated.timing(this.animations.bottomControl.opacity, {
                toValue: 0,
                duration: this.props.controlAnimationTiming,
                useNativeDriver: false,
            }),
            Animated.timing(this.animations.bottomControl.marginBottom, {
                toValue: -100,
                duration: this.props.controlAnimationTiming,
                useNativeDriver: false,
            }),
            Animated.timing(this.animations.controlStyle.opacity, {
                toValue: 0,
                duration: this.props.controlAnimationTiming,
                useNativeDriver: false,
            }),
        ]).start(() => {
            // console.log('Top controls hidden')
            this.setState({
                controlHiddenAnimationFinished: true,
            });

            Animated.timing(this.animations.topControl.marginTop, {
                toValue: 0,
                duration: this.props.controlAnimationTiming,
                useNativeDriver: false,
            }).start(() =>{
                // console.log('Top controls hidden well')
            });
        });
    }

    /**
     * Animation to show controls...opposite of
     * above...move onto the screen and then
     * fade in.
     */
    showControlAnimation() {
        Animated.parallel([
            Animated.timing(this.animations.topControl.opacity, {
                toValue: 1,
                useNativeDriver: false,
                duration: this.props.controlAnimationTiming,
            }),
            Animated.timing(this.animations.topControl.marginTop, {
                toValue: 0,
                useNativeDriver: false,
                duration: this.props.controlAnimationTiming,
            }),
            Animated.timing(this.animations.bottomControl.opacity, {
                toValue: 1,
                useNativeDriver: false,
                duration: this.props.controlAnimationTiming,
            }),
            Animated.timing(this.animations.bottomControl.marginBottom, {
                toValue: 0,
                useNativeDriver: false,
                duration: this.props.controlAnimationTiming,
            }),
            Animated.timing(this.animations.bottomControl.paddingBottom, {
                toValue: 20,
                useNativeDriver: false,
                duration: this.props.controlAnimationTiming,
            }),
            Animated.timing(this.animations.controlStyle.opacity, {
                toValue: 0.3,
                useNativeDriver: false,
                duration: this.props.controlAnimationTiming,
            }),
        ]).start(() => {
            this.setState({
                controlHiddenAnimationFinished: false,
            });
        });
    }

    onSkipPrevAnimation() {
        console.log('onSkipPrevAnimation');
        Animated.timing(
            this.animations.skipPrev.opacity, {
            toValue: 1,
            useNativeDriver: false,
            duration: 200,
        }).start(() =>{
            Animated.timing(
                this.animations.skipPrev.opacity, {
                toValue: 0,
                useNativeDriver: false,
                duration: 300,
            }).start()
        });
    }

    onSkipNextAnimation() {
        console.log('onSkipNextAnimation');
        Animated.timing(
            this.animations.skipNext.opacity, {
            toValue: 1,
            useNativeDriver: false,
            duration: 200,
        }).start(() =>{
            Animated.timing(
                this.animations.skipNext.opacity, {
                toValue: 0,
                useNativeDriver: false,
                duration: 300,
            }).start()
        });
    }

    /**
     * Loop animation to spin loader icon. If not loading then stop loop.
     */
    loadAnimation() {
        if (this.state.loading) {
            Animated.sequence([
                Animated.timing(this.animations.loader.rotate, {
                    toValue: this.animations.loader.MAX_VALUE,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: false,
                }),
                Animated.timing(this.animations.loader.rotate, {
                    toValue: 0,
                    duration: 0,
                    easing: Easing.linear,
                    useNativeDriver: false,
                }),
            ]).start(this.loadAnimation.bind(this));
        }
    }

    /**
     * Function to hide the controls. Sets our
     * state then calls the animation.
     */
    _hideControls() {
        if (this.mounted) {
            let state = this.state;
            state.showControls = false;
            this.hideControlAnimation();

            this.setState(state);
        }
    }

    /**
     * Function to toggle controls based on
     * current state.
     */
    _toggleControls() {
        let state = this.state;
        state.showControls = !state.showControls;

        if (state.showControls) {
            this.showControlAnimation();
            this.setControlTimeout();
            typeof this.events.onShowControls === 'function' &&
                this.events.onShowControls();
        } else {
            this.hideControlAnimation();
            this.clearControlTimeout();
            typeof this.events.onHideControls === 'function' &&
                this.events.onHideControls();
        }

        this.setState(state);
    }

    /**
     * Toggle fullscreen changes resizeMode on
     * the <Video> component then updates the
     * isFullscreen state.
     */
    _toggleFullscreen() {
        let state = this.state;
        // console.log(`before toggle isFullScreen = ${state.isFullscreen}`);

        state.isFullscreen = !state.isFullscreen;


        if (this.props.toggleResizeModeOnFullscreen) {
            state.resizeMode = state.isFullscreen === true ? 'cover' : 'contain';
        }

        if (state.isFullscreen) {
            typeof this.events.onEnterFullscreen === 'function' &&
                this.events.onEnterFullscreen();
        } else {
            typeof this.events.onExitFullscreen === 'function' &&
                this.events.onExitFullscreen();
        }

        this.setState(state);
        
        // console.log(`paused=${state.paused}`);
        if (state.isFullscreen) {
            this.props.onVideoFullScreen(true);
            Orientation.lockToLandscape();
        } else {
            if (Platform.OS === 'ios') {
                Orientation.lockToPortrait();
                this.props.onVideoFullScreen(false);
            }
            Orientation.lockToPortrait();
            this.props.onVideoFullScreen(false);
        }
        // console.log(`paused=${state.paused}`);

        // console.log(`after toggle isFullScreen = ${state.isFullscreen}`);
    }

    /**
     * Toggle playing state on <Video> component
     */
    _togglePlayPause() {
        // console.log('_togglePlayPause');
        let state = this.state;
        state.paused = !state.paused;
        // console.log(`_togglePlayPause: paused=${state.paused}`);

        if (state.paused) {
            typeof this.events.onPause === 'function' && this.events.onPause();
        } else {
            state.seektime = undefined;
            typeof this.events.onPlay === 'function' && this.events.onPlay();
        }

        this.setState(state);
    }

    /**
     * Toggle between showing time remaining or
     * video duration in the timer control
     */
    _toggleTimer() {
        let state = this.state;
        state.showTimeRemaining = !state.showTimeRemaining;
        this.setState(state);
    }

    /**
     * The default 'onBack' function pops the navigator
     * and as such the video player requires a
     * navigator prop by default.
     */
    _onBack() {
        if (this.props.navigator && this.props.navigator.pop) {
            this.props.navigator.pop();
        } else {
            console.warn(
                'Warning: _onBack requires navigator property to function. Either modify the onBack prop or pass a navigator prop',
            );
        }
    }

    /**
     * Calculate the time to show in the timer area
     * based on if they want to see time remaining
     * or duration. Formatted to look as 00:00.
     */
    calculateTime() {
        if (this.state.showTimeRemaining) {
            return `${this.secondsToHHMMSS(this.state.currentTime)} / ${this.secondsToHHMMSS(this.state.duration)}`;
        }

        return this.secondsToHHMMSS(this.state.currentTime);
    }

    /**
     * Format a time string as mm:ss
     *
     * @param {int} time time in milliseconds
     * @return {string} formatted time string in mm:ss format
     */
    formatTime(time = 0) {
        const symbol = this.state.showRemainingTime ? '-' : '';
        time = Math.min(Math.max(time, 0), this.state.duration);

        const formattedMinutes = Math.floor(time / 60).toFixed(0);
        const formattedSeconds = Math.floor(time % 60).toFixed(0);

        return `${symbol}${formattedMinutes}:${formattedSeconds}`;
    }

    /**
     * Format a time string as HH:mm:ss
     *
     * @param {int} time time in seconds
     * @return {string} formatted time string in mm:ss format
     */
    secondsToHHMMSS = (sec = 0) => {
        const hours = Math.floor(sec / 3600); // get hours
        const minutes = Math.floor((sec - hours * 3600) / 60); // get minutes
        const seconds = Math.floor(sec - hours * 3600 - minutes * 60); //  get seconds
        // add 0 if value < 10
        let sHours = hours > 0 ? `${hours}:` : '';
        let sMinutes = `${minutes}`;
        let sSeconds = `${seconds}`;
        
        if (minutes < 10) {
            sMinutes = '0' + sMinutes;
        }
        if (seconds < 10) {
            sSeconds = '0' + sSeconds;
        }

        // console.log(`$Duration=${sec}, Hours=${hours}, Minutes=${minutes}, Seconds=${seconds}`)
        return sHours + sMinutes + ':' + sSeconds;
    };

    /**
     * Set the position of the seekbar's components
     * (both fill and handle) according to the
     * position supplied.
     *
     * @param {float} position position in px of seeker handle}
     */
    setSeekerPosition(position = 0) {
        // console.log(position);
        let state = this.state;
        position = this.constrainToSeekerMinMax(position);

        state.seekerFillWidth = position;
        state.seekerPosition = position;

        if (!state.seeking) {
            state.seekerOffset = position;
        }

        this.setState(state);
    }

    /**
     * Constrain the location of the seeker to the
     * min/max value based on how big the
     * seeker is.
     *
     * @param {float} val position of seeker handle in px
     * @return {float} constrained position of seeker handle in px
     */
    constrainToSeekerMinMax(val = 0) {
        if (val <= 0) {
            return 0;
        } else if (val >= this.player.seekerWidth) {
            return this.player.seekerWidth;
        }
        return val;
    }

    /**
     * Calculate the position that the seeker should be
     * at along its track.
     *
     * @return {float} position of seeker handle in px based on currentTime
     */
    calculateSeekerPosition() {
        const percent = this.state.currentTime / this.state.duration;
        return this.player.seekerWidth * percent;
    }

    /**
     * Return the time that the video should be at
     * based on where the seeker handle is.
     *
     * @return {float} time in ms based on seekerPosition.
     */
    calculateTimeFromSeekerPosition() {
        const percent = this.state.seekerPosition / this.player.seekerWidth;
        return this.state.duration * percent;
    }

    /**
     * Return the time that the video should be at
     * based on where the seeker handle is.
     *
     * @return {float} time in ms based on seekerPosition.
     */
    calculateSeekerPositionFromTime(time) {
        return (time / this.state.duration) * this.player.seekerWidth;
    }

    /**
     * Seek to a time in the video.
     *
     * @param {float} time time to seek to in ms
     */
    seekTo(time = 0) {
        console.log(time);
        let state = this.state;
        state.currentTime = time;
        this.player.ref.seek(time);
        this.setState(state);
    }

    /**
     * Set the position of the volume slider
     *
     * @param {float} position position of the volume handle in px
     */
    setVolumePosition(position = 0) {
        let state = this.state;
        position = this.constrainToVolumeMinMax(position);
        state.volumePosition = position + this.player.iconOffset;
        state.volumeFillWidth = position;

        state.volumeTrackWidth = this.player.volumeWidth - state.volumeFillWidth;

        if (state.volumeFillWidth < 0) {
            state.volumeFillWidth = 0;
        }

        if (state.volumeTrackWidth > 150) {
            state.volumeTrackWidth = 150;
        }

        this.setState(state);
    }

    /**
     * Constrain the volume bar to the min/max of
     * its track's width.
     *
     * @param {float} val position of the volume handle in px
     * @return {float} contrained position of the volume handle in px
     */
    constrainToVolumeMinMax(val = 0) {
        if (val <= 0) {
            return 0;
        } else if (val >= this.player.volumeWidth + 9) {
            return this.player.volumeWidth + 9;
        }
        return val;
    }

    /**
     * Get the volume based on the position of the
     * volume object.
     *
     * @return {float} volume level based on volume handle position
     */
    calculateVolumeFromVolumePosition() {
        return this.state.volumePosition / this.player.volumeWidth;
    }

    /**
     * Get the position of the volume handle based
     * on the volume
     *
     * @return {float} volume handle position in px based on volume
     */
    calculateVolumePositionFromVolume() {
        return this.player.volumeWidth * this.state.volume;
    }

    /**
      | -------------------------------------------------------
      | React Component functions
      | -------------------------------------------------------
      |
      | Here we're initializing our listeners and getting
      | the component ready using the built-in React
      | Component methods
      |
      */

    /**
     * Before mounting, init our seekbar and volume bar
     * pan responders.
     */
    UNSAFE_componentWillMount() {
        this.initSeekPanResponder();
        this.initVolumePanResponder();
    }

    /**
     * To allow basic playback management from the outside
     * we have to handle possible props changes to state changes
     */
    UNSAFE_componentWillReceiveProps(nextProps) {
        if (this.state.paused !== nextProps.paused) {
            this.setState({
                paused: nextProps.paused,
            });
        }

        if (this.styles.videoStyle !== nextProps.videoStyle) {
            this.styles.videoStyle = nextProps.videoStyle;
        }

        if (this.styles.containerStyle !== nextProps.style) {
            this.styles.containerStyle = nextProps.style;
        }
    }

    /**
     * Upon mounting, calculate the position of the volume
     * bar based on the volume property supplied to it.
     */
    componentDidMount() {
        const position = this.calculateVolumePositionFromVolume();
        let state = this.state;
        this.setVolumePosition(position);
        state.volumeOffset = position;
        this.mounted = true;

        this.setState(state);
    }

    /**
     * When the component is about to unmount kill the
     * timeout less it fire in the prev/next scene
     */
    componentWillUnmount() {
        this.mounted = false;
        this.clearControlTimeout();
    }

    /**
     * Get our seekbar responder going
     */
    initSeekPanResponder() {
        this.player.seekPanResponder = PanResponder.create({
            // Ask to be the responder.
            onStartShouldSetPanResponder: (evt, gestureState) => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => true,

            /**
             * When we start the pan tell the machine that we're
             * seeking. This stops it from updating the seekbar
             * position in the onProgress listener.
             */
            onPanResponderGrant: (evt, gestureState) => {
                console.log("Grant");
                let state = this.state;
                this.clearControlTimeout();
                const position = evt.nativeEvent.locationX;
                this.setSeekerPosition(position);
                state.seeking = true;
                state.originallyPaused = state.paused;
                state.scrubbing = false;
                if (this.player.scrubbingTimeStep > 0) {
                    state.paused = true;
                }
                this.setState(state);
            },

            /**
             * When panning, update the seekbar position, duh.
             */
            onPanResponderMove: (evt, gestureState) => {
                console.log("Move");
                const position = this.state.seekerOffset + gestureState.dx;
                this.setSeekerPosition(position);
                let state = this.state;

                if (this.player.scrubbingTimeStep > 0 && !state.loading && !state.scrubbing) {
                    const time = this.calculateTimeFromSeekerPosition();
                    const timeDifference = Math.abs(state.currentTime - time) * 1000;

                    if (time < state.duration && timeDifference >= this.player.scrubbingTimeStep) {
                        state.scrubbing = true;

                        this.setState(state);
                        setTimeout(() => {
                            this.player.ref.seek(time, this.player.scrubbingTimeStep);
                        }, 1);
                    }
                }
            },

            /**
             * On release we update the time and seek to it in the video.
             * If you seek to the end of the video we fire the
             * onEnd callback
             */
            onPanResponderRelease: (evt, gestureState) => {
                console.log("Release");
                const time = this.calculateTimeFromSeekerPosition();
                let state = this.state;
                if (time >= state.duration && !state.loading) {
                    state.paused = true;
                    this.events.onEnd();
                } else if (state.scrubbing) {
                    state.seeking = false;
                } else {
                    this.seekTo(time);
                    this.setControlTimeout();
                    state.paused = state.originallyPaused;
                    // console.log(`onPanResponderRelease: paused=${state.paused}`);
                    state.seeking = false;
                }
                this.setState(state);
            },
        });
    }

    /**
     * Initialize the volume pan responder.
     */
    initVolumePanResponder() {
        this.player.volumePanResponder = PanResponder.create({
            onStartShouldSetPanResponder: (evt, gestureState) => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => true,
            onPanResponderGrant: (evt, gestureState) => {
                this.clearControlTimeout();
            },

            /**
             * Update the volume as we change the position.
             * If we go to 0 then turn on the mute prop
             * to avoid that weird static-y sound.
             */
            onPanResponderMove: (evt, gestureState) => {
                let state = this.state;
                const position = this.state.volumeOffset + gestureState.dx;

                this.setVolumePosition(position);
                state.volume = this.calculateVolumeFromVolumePosition();

                if (state.volume <= 0) {
                    state.muted = true;
                } else {
                    state.muted = false;
                }

                this.setState(state);
            },

            /**
             * Update the offset...
             */
            onPanResponderRelease: (evt, gestureState) => {
                let state = this.state;
                state.volumeOffset = state.volumePosition;
                this.setControlTimeout();
                this.setState(state);
            },
        });
    }
    
    onLoad = () => {
        this.setState({opacity: 0});
    }
    
    onBuffer = ({isBuffering}) => {
        this.setState({opacity: isBuffering ? 1 : 0});
    }

    /**
      | -------------------------------------------------------
      | Rendering
      | -------------------------------------------------------
      |
      | This section contains all of our render methods.
      | In addition to the typical React render func
      | we also have all the render methods for
      | the controls.
      |
      */

    /**
     * Renders an empty control, used to disable a control without breaking the view layout.
     */
    renderNullControl() {
        return <View style={[VideoPlayerstyles.controls.control]} />;
    }

    /**
     * Back button control
     */
    renderBack() {
        return this.renderControl(
            <Image
                source={require('../images/icons/back.png')}
                style={VideoPlayerstyles.controls.back}
            />,
            this.events.onBack,
            VideoPlayerstyles.controls.back,
        );
    }

    /**
     * Render the volume slider and attach the pan handlers
     */
    renderVolume() {
        return (
            <View style={VideoPlayerstyles.volume.container}>
                <View
                    style={[VideoPlayerstyles.volume.fill, { width: this.state.volumeFillWidth }]}
                />
                <View
                    style={[VideoPlayerstyles.volume.track, { width: this.state.volumeTrackWidth }]}
                />
                <View
                    style={[VideoPlayerstyles.volume.handle, { left: this.state.volumePosition }]}
                    {...this.player.volumePanResponder.panHandlers}>
                    <Image
                        style={VideoPlayerstyles.volume.icon}
                        source={require('../images/icons/volume.png')}
                    />
                </View>
            </View>
        );
    }

    /**
     * Render fullscreen toggle and set icon based on the fullscreen state.
     */
    renderFullscreen() {
        let source =
            this.state.isFullscreen === true
                ? require('../images/icons/shrink.png')
                : require('../images/icons/expand.png');
        return this.renderControl(
            <Image source={source} />,
            this.methods.toggleFullscreen,
            VideoPlayerstyles.controls.fullscreen,
        );
    }

    /**
     * Render the seekbar and attach its handlers
     */
    renderSeekbar() {
        return (
            <View
                style={VideoPlayerstyles.seekbar.container}
                collapsable={false}
                {...this.player.seekPanResponder.panHandlers}>
                <View
                    style={VideoPlayerstyles.seekbar.track}
                    onLayout={event =>
                        (this.player.seekerWidth = event.nativeEvent.layout.width)
                    }
                    pointerEvents={'none'}>
                    <View
                        style={[
                            VideoPlayerstyles.seekbar.fill,
                            {
                                width: this.state.seekerFillWidth,
                                backgroundColor: this.props.seekColor || '#FFF',
                            },
                        ]}
                        pointerEvents={'none'}
                    />
                </View>
                <View
                    style={[VideoPlayerstyles.seekbar.handle, { left: this.state.seekerPosition }]}
                    pointerEvents={'none'}>
                    <View
                        style={[
                            VideoPlayerstyles.seekbar.circle,
                            { backgroundColor: this.props.seekColor || '#FFF' },
                        ]}
                        pointerEvents={'none'}
                    />
                </View>
            </View>
        );
    }

    /**
     * Render the play/pause button and show the respective icon
     */
    renderPlayPause() {
        let source =
            this.state.paused === true
                ? require('../images/icons/play.png')
                : require('../images/icons/pause.png');
        return this.renderControl(
            <Image source={source} style={{backgroundColor: 'transparent'}}/>,
            this.methods.togglePlayPause,
            VideoPlayerstyles.controls.playPause,
        );
    }

    /**
     * Render our title...if supplied.
     */
    renderTitle() {
        if (this.opts.title) {
            return (
                <View style={[VideoPlayerstyles.controls.control, VideoPlayerstyles.controls.title]}>
                    <Text
                        style={[VideoPlayerstyles.controls.text, VideoPlayerstyles.controls.titleText]}
                        numberOfLines={1}>
                        {this.opts.title || ''}
                    </Text>
                </View>
            );
        }

        return null;
    }

    /**
     * Show our timer.
     */
    renderTimer() {
        return this.renderControl(
            <Text style={VideoPlayerstyles.controls.timerText}>{this.calculateTime()}</Text>,
            this.methods.toggleTimer,
            VideoPlayerstyles.controls.timer,
        );
    }

    /**
     * Show loading icon
     */
    renderLoader() {
        if (this.state.loading) {
            return (
                <View style={VideoPlayerstyles.loader.container}>
                    <Animated.Image
                        source={require('../images/icons/loader-icon.png')}
                        style={[
                            VideoPlayerstyles.loader.icon,
                            {
                                transform: [
                                    {
                                        rotate: this.animations.loader.rotate.interpolate({
                                            inputRange: [0, 360],
                                            outputRange: ['0deg', '360deg'],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                </View>
            );
        }
        return null;
    }

    renderError() {
        if (this.state.error) {
            return (
                <SafeAreaView style={VideoPlayerstyles.error.container}>
                    <TouchableOpacity onPress={() => this.reloadPlayer()}>
                        <View style={{ justifyContent: 'center', alignItems: 'center', }}>
                            <Image
                                source={require('../images/icons/error-icon.png')}
                                style={VideoPlayerstyles.error.icon}
                            />
                            <Text style={VideoPlayerstyles.error.text}>Video unavailable</Text>
                            <Text style={VideoPlayerstyles.error.text}>Click here to reload</Text>
                        </View>
                    </TouchableOpacity>
                </SafeAreaView>
            );
        }
        return null;
    }

    /**
     * Groups the top bar controls together in an animated
     * view and spaces them out.
     */
     renderTopControls() {
        const backControl = this.props.disableBack
            ? this.renderNullControl()
            : this.renderBack();
        const volumeControl = this.props.disableVolume
            ? this.renderNullControl()
            : this.renderVolume();
        const fullscreenControl = this.props.disableFullscreen
            ? this.renderNullControl()
            : this.renderFullscreen();

        return (
            <Animated.View
                style={[
                    VideoPlayerstyles.controls.top,
                    {
                        opacity: this.animations.topControl.opacity,
                        marginTop: this.animations.topControl.marginTop,
                    },
                    {backgroundColor: "transparent"}
                ]}>
                {/* <ImageBackground
                    source={require('../images/icons/top-vignette.png')}
                    style={[VideoPlayerstyles.controls.column]}
                    imageStyle={[VideoPlayerstyles.controls.vignette]}> */}
                    <SafeAreaView style={[VideoPlayerstyles.controls.topControlGroup, {backgroundColor: 'transparent'}]}>
                        {backControl}
                        <View style={VideoPlayerstyles.controls.pullRight}>
                            {volumeControl}
                            {fullscreenControl}
                        </View>
                    </SafeAreaView>
                {/* </ImageBackground> */}
            </Animated.View>
        );
    }
    
    /**
     * Render bottom control group and wrap it in a holder
     */
    renderBottomControls() {
        const timerControl = this.props.disableTimer
            ? this.renderNullControl()
            : this.renderTimer();
        const seekbarControl = this.props.disableSeekbar
            ? this.renderNullControl()
            : this.renderSeekbar();
        const playPauseControl = this.props.disablePlayPause
            ? this.renderNullControl()
            : this.renderPlayPause();

        return (
            <Animated.View
                style={[
                    VideoPlayerstyles.controls.bottom,
                    {
                        opacity: this.animations.bottomControl.opacity,
                        marginBottom: this.animations.bottomControl.marginBottom,
                    },
                    {backgroundColor: "transparent"}
                ]}>
                {/* <ImageBackground
                    source={require('../images/icons/bottom-vignette.png')}
                    style={[VideoPlayerstyles.controls.column]}
                    imageStyle={[VideoPlayerstyles.controls.vignette]}> */}
                    <SafeAreaView
                        style={[VideoPlayerstyles.controls.row, VideoPlayerstyles.controls.bottomControlGroup, {backgroundColor: 'transparent'}]}>
                        {timerControl}
                        {this.renderTitle()}
                        {playPauseControl}
                    </SafeAreaView>
                    {seekbarControl}
                {/* </ImageBackground> */}
            </Animated.View>
        );
    }

    /**
     * Standard render control function that handles
     * everything except the sliders. Adds a
     * consistent <TouchableHighlight>
     * wrapper and styling.
     */
     renderControl(children, callback, style = {}) {
        return (
            <TouchableHighlight
                underlayColor="transparent"
                activeOpacity={0.3}
                onPress={() => {
                    this.resetControlTimeout();
                    callback();
                }}
                style={[VideoPlayerstyles.controls.control, style, {backgroundColor: 'transparent'}]}>
                {children}
            </TouchableHighlight>
        );
    }

    //CUSTOM ADDED BY RAY
    renderSkipControls() {
        const leftControl = this.props.disableLeftControl
            ? this.renderNullControl()
            : this.renderLeftControl();
        const rightControl = this.props.disableRightControl
            ? this.renderNullControl()
            : this.renderRightControl();

        return (
            <View
                style={[
                    VideoPlayerstyles.player.container, 
                    VideoPlayerstyles.controls.touchableContainer,
                ]}>
                <SafeAreaView
                    style={[{backgroundColor: "transparent"}]}>
                    {leftControl}
                </SafeAreaView>
                <SafeAreaView
                    style={[{backgroundColor: "transparent"}]}>
                    {rightControl}
                </SafeAreaView>
            </View>
        );
    }
    
    renderLeftControl(){
        let source = require('../images/icons/double-arrow-left.png');
        return(
            <TouchableOpacity 
                underlayColor="transparent"
                activeOpacity={0.3}
                onPress={() => {
                    this.events.onLeftScreenTouch();
                }}
                style={this.state.isFullscreen == true ?
                    [VideoPlayerstyles.controls.control, VideoPlayerstyles.controls.touchableLeftFullScreen, 
                    {justifyContent: 'center', alignItems: 'center',}] : 
                    [VideoPlayerstyles.controls.control, VideoPlayerstyles.controls.touchableLeft, 
                    {justifyContent: 'center', alignItems: 'center',}]}>
                <Animated.View
                    style={{
                        opacity: this.animations.skipPrev.opacity,
                        backgroundColor: 'transparent'
                    }} 
                >
                    <Image source={source}/>
                </Animated.View>
            </TouchableOpacity >
        )
    }

    renderRightControl(){
        let source = require('../images/icons/double-arrow-right.png');
        return(
            <TouchableOpacity
                underlayColor="transparent"
                activeOpacity={0.3}
                onPress={() => {
                    this.events.onRightScreenTouch();
                }}
                style={this.state.isFullscreen == true ?
                    [VideoPlayerstyles.controls.control, VideoPlayerstyles.controls.touchableRightFullScreen, 
                    {justifyContent: 'center', alignItems: 'center',}] : 
                    [VideoPlayerstyles.controls.control, VideoPlayerstyles.controls.touchableRight, 
                    {justifyContent: 'center', alignItems: 'center',}]}>
                <Animated.View
                    style={{
                        opacity: this.animations.skipNext.opacity,
                        backgroundColor: 'transparent'
                    }} 
                >
                    <Image source={source}/>
                </Animated.View>
            </TouchableOpacity>
        )
    }

    renderControlsOpacityBackground() {
        return (
            <Animated.View
                style={[
                    VideoPlayerstyles.player.container, 
                    VideoPlayerstyles.controls.touchableContainer,
                    {
                        backgroundColor: "black", 
                        opacity: this.animations.controlStyle.opacity,
                    }
                ]}>
            </Animated.View>
        );
    }

    async reloadPlayer() {
        this.setState({ source: null });
        this.setState({ source: this.props.source, error: false });
    }

    async playVideo() {
        console.log('playVideo-new2');
        this.setState({ player: false, paused: false });
        typeof this.events.onPlay === 'function' && this.events.onPlay();
    }

    /**
     * Provide all of our options and render the whole component.
     */
    // render() {
    //     return (
    //         <TouchableWithoutFeedback
    //             onPress={this.events.onScreenTouch}
    //             style={[VideoPlayerstyles.player.container, this.styles.containerStyle]}>
    //             {
    //                 this.state.player ? (
    //                     <ImageBackground resizeMode='cover' source={{ uri: this.state.thumbnail }} style={{
    //                         height: screen.height / 3,
    //                         width: '100%'
    //                     }} >
    //                         <View style={{
    //                             backgroundColor: 'rgba(0,0,0,0.3)',
    //                             height: '100%',
    //                             width: '100%'
    //                         }}>
    //                             <View style={{
    //                                 flex: 1,
    //                                 justifyContent: 'center',
    //                                 alignItems: 'center',
    //                             }}>
    //                                 <TouchableOpacity onPress={() => this.playVideo()}><Icon name="play-circle-outline" size={50} color="#6200ee" /></TouchableOpacity>
    //                             </View>
    //                         </View>
    //                     </ImageBackground>
    //                 ) : (
    //                     <View style={[VideoPlayerstyles.player.container, this.styles.containerStyle]}>
    //                         <TouchableOpacity
    //                             onPress={this.events.onLeftScreenTouch}
    //                             style={[VideoPlayerstyles.controls.touchable, VideoPlayerstyles.controls.left]}
    //                         >
    //                         </TouchableOpacity>
    //                         <TouchableOpacity
    //                             onPress={this.events.onRightScreenTouch}
    //                             style={[VideoPlayerstyles.controls.touchable, VideoPlayerstyles.controls.right]}
    //                         >
    //                         </TouchableOpacity>
    //                         <Video
    //                             {...this.props}
    //                             ref={videoPlayer => (this.player.ref = videoPlayer)}
    //                             resizeMode={this.state.resizeMode}
    //                             volume={this.state.volume}
    //                             removeClippedSubviews={false}
    //                             paused={this.state.paused}
    //                             muted={this.state.muted}
    //                             rate={this.state.rate}
    //                             onLoadStart={this.events.onLoadStart}
    //                             onProgress={this.events.onProgress}
    //                             onError={this.events.onError}
    //                             onLoad={this.events.onLoad}
    //                             onEnd={this.events.onEnd}
    //                             onSeek={this.events.onSeek}
    //                             style={[VideoPlayerstyles.player.video, this.styles.videoStyle]}
    //                             source={{
    //                                 uri: this.state.source.uri,
    //                                 type: 'mp4',
    //                                 headers: {
    //                                     'range': this.state.rangeHeader
    //                                 }
    //                             }}
    //                             // source={{uri: convertToProxyURL(this.state.source.uri)}}
    //                             onBuffer={this.onBuffer}
    //                             onLoadStart={this.onLoadStart}
    //                         />
    //                         {/* WIP
    //                         <ActivityIndicator
    //                             animating
    //                             size="large"
    //                             color={"#FFC0CB"}
    //                             style={[VideoPlayerstyles.indicator.activityIndicator, {opacity: this.state.opacity}]}
    //                         /> */}

    //                         { this.state.error ? this.renderError() : null}
    //                         { this.state.error == false ? this.renderLoader() : null}
    //                         { this.state.error == false ? this.renderTopControls() : null}
    //                         { this.state.error == false ? this.renderBottomControls() : null}
    //                     </View>
    //                 )
    //             }
    //         </TouchableWithoutFeedback>
    //     );
    // }

    render() {
        if(this.state.player){
            return(
                <ImageBackground resizeMode='cover' source={{ uri: this.state.thumbnail }} style={{
                    height: screen.height / 3,
                    width: '100%'
                }} >
                    <View style={{
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        height: '100%',
                        width: '100%'
                    }}>
                        <View style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <TouchableOpacity onPress={() => this.playVideo()}><Icon name="play-circle-outline" size={50} color="#6200ee" /></TouchableOpacity>
                        </View>
                    </View>
                </ImageBackground>
            )
        }
        else{
            return(
                <View style={[VideoPlayerstyles.player.container, this.styles.containerStyle, {backgroundColor: "transparent"}]}>
                    <Video
                        {...this.props}
                        ref={videoPlayer => (this.player.ref = videoPlayer)}
                        resizeMode={this.state.resizeMode}
                        volume={this.state.volume}
                        removeClippedSubviews={false}
                        paused={this.state.paused}
                        muted={this.state.muted}
                        rate={this.state.rate}
                        onLoadStart={this.events.onLoadStart}
                        onProgress={this.events.onProgress}
                        onError={this.events.onError}
                        onLoad={this.events.onLoad}
                        onEnd={this.events.onEnd}
                        onSeek={this.events.onSeek}
                        style={[VideoPlayerstyles.player.video, this.styles.videoStyle]}
                        source={{
                            uri: this.state.source.uri,
                            type: 'mp4'//,
                            //headers: {
                            //    'range': this.state.rangeHeader
                            //}
                        }}
                        // source={{uri: convertToProxyURL(this.state.source.uri)}}
                        onBuffer={this.onBuffer}
                        onLoadStart={this.onLoadStart}
                        //seek={0}
                    />
                    {/* WIP
                    <ActivityIndicator
                        animating
                        size="large"
                        color={"#FFC0CB"}
                        style={[VideoPlayerstyles.indicator.activityIndicator, {opacity: this.state.opacity}]}
                    /> */}
                    { this.state.error ? this.renderError() : null}
                    { this.state.error == false ? this.renderControlsOpacityBackground() : null}
                    { this.state.error == false ? this.renderSkipControls() : null}
                    { this.state.error == false ? this.renderLoader() : null}
                    { this.state.error == false ? this.renderTopControls() : null}
                    { this.state.error == false ? this.renderBottomControls() : null}
                </View>
            )
       }
    }
}

const VideoPlayerstyles = {
    player: StyleSheet.create({
        container: {
            overflow: 'hidden',
            backgroundColor: '#000',
            flex: 1,
            alignSelf: 'stretch',
            justifyContent: 'space-between',
            // DEBUG
            // height: screen.height,
            // width: screen.width,
        },
        video: {
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        },
    }),
    error: StyleSheet.create({
        container: {
            backgroundColor: 'rgba( 0, 0, 0, 0.5 )',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            justifyContent: 'center',
            alignItems: 'center',
        },
        icon: {
            marginBottom: 16,
        },
        text: {
            backgroundColor: 'transparent',
            color: '#f27474',
        },
        reloadtext: {
            backgroundColor: 'transparent',
            color: '#ffffff',
        },
    }),
    loader: StyleSheet.create({
        container: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            alignItems: 'center',
            justifyContent: 'center',
        },
    }),
    controls: StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: null,
            width: null,
        },
        column: {
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: null,
            width: null,
        },
        vignette: {
            resizeMode: 'stretch',
        },
        control: {
            padding: 5,
        },
        text: {
            backgroundColor: 'transparent',
            color: '#FFF',
            fontSize: 14,
            textAlign: 'center',
        },
        pullRight: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        top: {
            // flex: 1,
            // alignItems: 'stretch',
            justifyContent: 'flex-start',
        },
        bottom: {
            // alignItems: 'stretch',
            // flex: 2,
            justifyContent: 'flex-end',
        },
        topControlGroup: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: 'row',
            width: null,
            marginTop: 12,
            marginLeft: 12,
            marginRight: 12,
        },
        bottomControlGroup: {
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginLeft: 12,
            marginRight: 12,
            marginBottom: 0,
        },
        minZIndex:{
            zIndex:-999
        },
        maxZIndex:{
            zIndex:999
        },
        volume: {
            flexDirection: 'row',
        },
        fullscreen: {
            flexDirection: 'column',
        },
        playPause: {
            position: 'relative',
            zIndex: 0,
        },
        title: {
            alignItems: 'center',
            flex: 0.6,
            flexDirection: 'column',
            padding: 0,
        },
        titleText: {
            textAlign: 'center',
        },
        timer: {
            width: 'auto',
        },
        timerText: {
            backgroundColor: 'transparent',
            color: '#FFF',
            fontSize: 12,
            textAlign: 'left',
        },
        //CUSTOM ADDED BY RAY
        touchableContainer: {
            flexDirection: "row",
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: 'transparent',
        },
        touchableLeft: {
            flex: 1,
            width: screen.width / 2,
            backgroundColor: "transparent",
        },
        touchableLeftFullScreen: {
            flex: 1,
            width: screen.height / 2,
            backgroundColor: "transparent",
        },
        touchableRight: {
            flex: 1,
            width: screen.width / 2,
            backgroundColor: "transparent",
        },
        touchableRightFullScreen: {
            flex: 1,
            width: screen.height / 2,
            backgroundColor: "transparent",
        },
    }),
    volume: StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexDirection: 'row',
            height: 1,
            marginLeft: 20,
            marginRight: 20,
            width: 150,
        },
        track: {
            backgroundColor: '#333',
            height: 1,
            marginLeft: 7,
        },
        fill: {
            backgroundColor: '#FFF',
            height: 1,
        },
        handle: {
            position: 'absolute',
            marginTop: -24,
            marginLeft: -24,
            padding: 16,
        },
        icon: {
            marginLeft: 7,
        },
    }),
    seekbar: StyleSheet.create({
        container: {
            alignSelf: 'stretch',
            height: 28,
            marginLeft: 20,
            marginRight: 20,
        },
        track: {
            backgroundColor: '#333',
            height: 1,
            position: 'relative',
            top: 14,
            width: '100%',
        },
        fill: {
            backgroundColor: '#FFF',
            height: 1,
            width: '100%',
        },
        handle: {
            position: 'absolute',
            marginLeft: -7,
            height: 28,
            width: 28,
        },
        circle: {
            borderRadius: 12,
            position: 'relative',
            top: 8,
            left: 8,
            height: 12,
            width: 12,
        },
    }),
    indicator: StyleSheet.create({
        activityIndicator: {
            position: 'absolute',
            top: 70,
            left: 70,
            right: 70,
            height: 50,
        },
    }),
    backgroundVideoFullScreen: {
        height: screenHeight,
        width: screenWidth,
    },
};
