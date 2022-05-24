import React from 'react';
import {Platform, View} from 'react-native';
import Video from 'react-native-video-ui-controls';

const VideoPlayer4 = (props) => {
    const {name, source} = props.route.params;

    return (
        <View style={{flex: 1}}>
            <Video
                name={name}
                source={source}
                onBackPress={() => {
                    props.navigation.goBack();
                }}
                isFullscreen={Platform.OS === 'ios'}
            />
        </View>
    );
};

export default VideoPlayer4;