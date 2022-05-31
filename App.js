// VIDEOPLAYER 1,2,4
// import React from 'react';
// import { StyleSheet, View } from 'react-native';
// import VideoPlayer from './Components/VideoPlayer';
// import VideoPlayer2 from './Components/VideoPlayer2';
// import VideoPlayer4 from './Components/VideoPlayer4';

// const App = () => {
//   return (
//     <View style={styles.container}>
//       <VideoPlayer2 />
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     backgroundColor: 'black',
//   },
// });

// export default App;

// VIDEOPLAYER3
import React from "react";  
import {Button, View, Text, StyleSheet, StatusBar, Dimensions, Touchable } from "react-native";  
import { createAppContainer } from "react-navigation";  
import { createStackNavigator } from "react-navigation-stack";

import Video from 'react-native-video';
import VideoPlayer2 from './Components/VideoPlayer2';
import VideoPlayer3 from './Components/VideoPlayer3';
import { WebView } from 'react-native-webview';
import Orientation from 'react-native-orientation-locker';
import VisibilitySensor from '@svanboxel/visibility-sensor-react-native'
import { SlideFromRightIOS } from "react-navigation-stack/lib/typescript/src/vendor/TransitionConfigs/TransitionPresets";
import BottomSheet from "./Components/BottomSheet";
import { TouchableHighlight } from "react-native";

const video = require('./Sample.mp4');
const videoStreamNeedRangeHeader = "http://10.0.2.2:3003/video";
const videoStreamNoNeedRangeHeader = "http://10.0.2.2:3003/video2"; // IF SEEK, VIDEO SENDING RANGE HEADER, AND SERVER GIVE ONLY CHUNK. VIDEO WILL STOP IN THE MIDDLE
const videoDirectLink = "http://192.168.1.97:3003/videoDirectLinkTest"; // USE THIS
//const videoDirectLink = "http://192.168.1.97:3003/videoDirectLinkS3"; // USE THIS
const videoDirectLinkNotFound = "http://google.com/notavideo";
const videoHLS = "http://10.0.2.2:3003/videoHLS/Sample.m3u8";
const imageUrl = "images/";
const screen = Dimensions.get('window');

class HomeScreen extends React.Component {

  constructor(props){
    super(props);
    Orientation.lockToPortrait();
    // Orientation.lockToLandscape();
  }

  state = {
    paused: false,
    textVisibility: false,
    webheight:250,
    isFullScreen: false,
    isBottomSheetVisible: false,
  }
  
  onVideoFullScreen(isFullScreen) {
    // console.log('onVideoFullScreen called');
    this.setState({
      isFullScreen: isFullScreen
    })
  }

  hideBottomSheet = () => {
    // console.log('hideBottomSheet');
    this.setState({
      isBottomSheetVisible: false,
    });
  }

  render() {  
      const webViewScript = `
        setTimeout(function() { 
          window.ReactNativeWebView.postMessage(document.documentElement.scrollHeight); 
        }, 500);
        true; // note: this is required, or you'll sometimes get silent failures
      `;
      console.log("NewPlayer");
      return (
        // <View>
        //   <View
        //     // style={styles.container} 
        //     // style={styles.container2} 
        //     style={{height: this.state.webheight}}
        //     // onLayout={(event) => {
        //     //   var {x, y, width, height} = event.nativeEvent.layout;
        //     //   console.log(height);
        //     // }}
        //   >
        //     {/* <StatusBar hidden /> */}
        //     <WebView
        //       automaticallyAdjustContentInsets={false}
        //       style={{backgroundColor: 'blue'}}
        //       source={{ uri: 'http://10.0.2.2:3000/' }}
        //       javaScriptEnabled={true}
        //       scrollEnabled={false}
        //       allowsFullscreenVideo={true}
        //       allowsInlineMediaPlayback={true}
        //       mediaPlaybackRequiresUserAction={false}
        //       cacheEnabled={false}
        //       javaScriptEnabled={true}
        //       injectedJavaScriptBeforeContentLoaded={webViewScript}
        //       domStorageEnabled={true}
        //       onMessage={event => {
        //         console.log(event.nativeEvent.data);
        //         this.setState({webheight: parseInt(event.nativeEvent.data)});
        //       }}
        //     />
        //   </View> 
        //   <VisibilitySensor
        //     onChange={(visible ) => {
        //       // console.log(visible );
        //       this.setState({textVisibility: visible })
        //     }}
        //   >
        //     <Text>This is a video</Text>
        //   </VisibilitySensor>
        // </View>  
        
        <View style={{flex: 1}}>
          <StatusBar hidden={this.state.isFullScreen} />
          <View 
            style={this.state.isFullScreen === true ? styles.videoContainerFullScreen : styles.videoContainer}
            >
            {/* <Video source={{uri: videoDirectLink}}   // Can be a URL or a local file.
              ref={(ref) => {
                this.player = ref
              }}                                      // Store reference
              paused={false}
              onBuffer={this.onBuffer}                // Callback when remote video is buffering
              onError={this.videoError}               // Callback when video cannot be loaded
              style={styles.backgroundVideo} /> */}

            <VideoPlayer3
              source={{ uri: videoDirectLink }}
              navigator={this.AppNavigator}
              tapAnywhereToPause={false}
              toggleResizeModeOnFullscreen={false}
              isFullScreen={false}
              //thumbnail={imageUrl}
              disableBack={true}
              disableVolume={true}
              disableSeekbar={false}
              controlTimeout={5000}
              paused={this.state.paused}
              seekColor={'#576CEC'}
              onVideoFullScreen={this.onVideoFullScreen.bind(this)}
              title={'Sample.mp4'}
              showOnStart={true}
              // paused={true}
            />
          </View>
          {
            this.state.isFullScreen === true ? null :
            <TouchableHighlight
              underlayColor="transparent"
              activeOpacity={0.3}
              onPress={() => {
                // console.log("showBottomSheet")
                let state = this.state;
                state.isBottomSheetVisible = true;
                this.setState(state);
              }}>
              <Text>Hello World</Text>
            </TouchableHighlight>
          }
          <BottomSheet 
            visible={this.state.isBottomSheetVisible}
            controlAnimationTiming={500}
            onBackgroundTouch={this.hideBottomSheet}
          />
        </View>
      );  
  }  
}  

const AppNavigator = createStackNavigator({  
  Home: {  
      screen: HomeScreen  
  }  
});

const styles = StyleSheet.create({
  videoContainer: {
    height: screen.height / 3 + 3
  },
  videoContainerFullScreen: {
    backgroundColor:"black",
    height: screen.width,
    position: 'absolute',
    left: 0,
    width: screen.height,
    zIndex: 1,
  }//,
  //backgroundVideo: {
  //  position: 'absolute',
  //  top: 0,
  //  left: 0,
  //  bottom: 0,
  //  right: 0,
  //},
});

// export default createAppContainer(AppNavigator);  
export default HomeScreen;  
