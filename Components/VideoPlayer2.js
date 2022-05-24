import React, { useState, useRef, Component } from 'react';
import { AppRegistry, StyleSheet, Text, View, Platform, Dimensions, Animated, AppState, TouchableWithoutFeedback } from 'react-native';
import MediaControls, { PLAYER_STATES } from 'react-native-media-controls';
import Video from 'react-native-video';
import convertToProxyURL from 'react-native-video-cache';
import Icon from "react-native-vector-icons/FontAwesome"
import ProgressBar from "react-native-progress/Bar"

function secondsToTime(time) {
    return ~(time / 60) + ":" + (time % 60 < 10 ? "0" : "") + time % 60;
}

export default class VideoPlayer2 extends Component {
    state = {
        error: false,
        buffering: true,
        animated: new Animated.Value(0),
        paused: false,
        progress: 0,
        duration: 0,
    };

    handleError = (meta) => {
        console.log(meta);
        const { error: { code }} = meta;
        let error = "An error occured";

        switch(code){
            case -11800:
                error = "Could not load video from URL";
                break;
        }

        this.setState({
            error
        })
    }

    handleLoadStart = () => {
        console.log("handle load start");
        this.triggerBufferAnimation();
    }

    triggerBufferAnimation = () => {
        this.loopingAnimation = Animated.loop(
            Animated.timing(this.state.animated, {
                toValue: 1,
                duration: 350,
                useNativeDriver: true,
            })
        ).start();
    }

    handleBuffer = (meta) => {
        console.log("handle buffer");
        meta.isBuffering && this.triggerBufferAnimation();

        if (this.loopingAnimation && !meta.isBuffering){
            console.log("stopping animation");
            this.loopingAnimation.stopAnimation();
        }

        this.setState({
            buffering: meta.isBuffering
        })
    }

    //WORKAROUND FOR HANDLEBUFFER NOT WORKING
    handleProgress = (data) => {
        this.setState({
            progress: data.currentTime / this.state.duration
        })
        // console.log(data.playableDuration + "|" + data.currentTime);
        // console.log(this.state.progress + "|" + data.progress)
        if (data.playableDuration !== 0 && this.state.progress === data.currentTime){
            if (this.state.buffering === false){
                console.log("setting buffering state to true");
                this.triggerBufferAnimation();
                this.setState({
                    buffering: true
                })
            }
        } else {
            if (this.state.buffering){
                console.log("setting buffering state to false");
                this.setState({
                    buffering: false
                })
            }
        }

        this.state.progress = data.currentTime
        // this.setState({
        //     previousTime: data.currentTime
        // })
    }

    handleLoad = (meta) => {
        this.setState({
            duration: meta.duration
        })
    }

    handleEnd = () => {
        this.setState({
            paused: true
        })
    }

    handleMainButtonTouch = () => {
        if (this.state.progress > 1) {
            this.player.seek(0);
        }

        this.setState(state => {
            return{
                paused: state.paused
            }
        })
    }

    handleProgressPress = (e) => {
        const position = e.nativeElement.locationX;
        const progress = (position / 250) * this.state.duration;
        this.player.seek(progress);
    }
    
    render() {
        // console.log("rendering");
        const { width } = Dimensions.get("window");
        const height = width * 0.5625;
        const { error } = this.state;
        const { buffering } = this.state;
        const interpolatedAnimation = this.state.animated.interpolate({
            inputRange: [0, 1],
            outputRange: ["0deg", "360deg"],
        });

        const rotateStyle = {
            transform: [
                { rotate : interpolatedAnimation }
            ]
        }

        // The video we will play on the player.
        const video = require('../Sample.mp4');
        const videoStream = "http://10.0.2.2:3003/video";
        const videoDirectLink = "http://10.0.2.2:3003/videoDirectLink";
        const videoDirectLinkNotFound = "http://google.com/notavideo";
        // console.log("rendering");
        
        return (
            <View style={styles.container}>
                {/* <View style={error ? styles.error : ( buffering ? styles.buffering : undefined)}> */}
                <View>
                    <Video
                        style={{ width: "100%", height}}
                        // source={video}
                        source={{uri: videoDirectLink}}
                        // source={{uri: convertToProxyURL(videoDirectLink)}}
                        resizeMode={'cover'}
                        onError={this.handleError}
                        onLoadStart={this.handleLoadStart}
                        onBuffer={this.handleBuffer}
                        onLoad={this.handleLoad}
                        onProgress={this.handleProgress}
                        onEnd={this.handleEnd}
                        ref={ref => this.player = ref}
                        paused={this.state.paused}
                        controls={true}
                        // onError={(error) => console.log(error)}
                    />
                    {/* <View style={styles.videoCover}>
                        {error && <Icon name="exclamation-triangle" size={30} color="red"/>}
                        {error && <Text>{error}</Text>}
                        {buffering && <Animated.View style={rotateStyle}><Icon name="circle-o-notch" size={30} color="red" /></Animated.View>}
                    </View> */}
                    {/* <View style={StyleSheet.controls}>
                        <TouchableWithoutFeedback onPress={this.handleMainButtonTouch}>
                            <Icon name={!this.state.paused ? "pause" : "play"} size={30} color="#FFF"/>
                        </TouchableWithoutFeedback>
                        <TouchableWithoutFeedback onPress={this.handleProgressPress}>
                            <View>
                                <ProgressBar
                                    progress={this.state.progress}
                                    color="#FFF"
                                    unfilledColor="rgba(255,255,255,.5)"
                                    borderColor="#FFF"
                                    width={250}
                                    height={250}
                                />
                                <Text style={styles.duration}>
                                    {secondsToTime(Math.floor(this.state.progress * this.state.duration))}
                                </Text>
                            </View>
                        </TouchableWithoutFeedback>
                    </View> */}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 250,
    },
    // videoCover: {
    //     alignItems: "center",
    //     justifyContent: "center",
    //     position: "absolute",
    //     left: 0,
    //     top: 0,
    //     right: 0,
    //     bottom: 0,
    //     backgroundColor: "transparent"
    // },
    // error: {
    //     backgroundColor: "#000",
    // },
    // buffering: {
    //     backgroundColor: "#000",
    // },
    controls: {
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        height: 48,
        left: 0,
        bottom: 0,
        right: 0,
        position: "absolute",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        paddingHorizontal: 10,
    },
    mainButton: {
        marginRight: 15,
    },
    duration: {
        color: "#FFF",
        marginLeft: 15,
    },
});