import React, {useState, useEffect} from 'react';
import {View, Text, Animated, StyleSheet, Dimensions, TouchableOpacity, Pressable, StatusBar,} from "react-native";

const BottomSheet = props => {
    const [isAnimated, setIsAnimated] = useState(false);
    const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

    useEffect(() => {
        if (props.visible === true){
            Animated.parallel([
                Animated.timing(animations.cover.opacity, {
                    toValue: 0.5,
                    duration: props.controlAnimationTiming,
                    useNativeDriver: false,
                }),
                Animated.timing(animations.sheet.height, {
                    toValue: Dimensions.get("window").height - StatusBar.currentHeight,
                    duration: props.controlAnimationTiming,
                    useNativeDriver: false,
                }),
            ]).start(() => {
                // console.log("Animation completed");
            });
        }
    });

    const onBackgroundTouch = () => {
        Animated.parallel([
            Animated.timing(animations.cover.opacity, {
                toValue: 0,
                duration: props.controlAnimationTiming,
                useNativeDriver: false,
            }),
            Animated.timing(animations.sheet.height, {
                toValue: Dimensions.get("window").height - StatusBar.currentHeight + 80,
                duration: props.controlAnimationTiming,
                useNativeDriver: false,
            }),
        ]).start(() =>{
            props.onBackgroundTouch();
        });
    }

    return (
        props.visible === false ? null : 
        <Animated.View style={[styles.sheet, {
            height: animations.sheet.height,
        }]}>
            <AnimatedPressable 
                onPress={onBackgroundTouch}
                style={[styles.cover, styles.sheet, {opacity: animations.cover.opacity}]} />
            <View style={[styles.popup]}>
                <TouchableOpacity>
                    <Text>Close</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    sheet: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "100%",
        justifyContent: "flex-end",
    },
    popup: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: 80,
        alignItems: "center",
        justifyContent: "center",
    },
    cover: {
        backgroundColor: "black",
        height: Dimensions.get("window").height,
    },
});

const animations = {
    sheet:{
        height: new Animated.Value(Dimensions.get("window").height - StatusBar.currentHeight + 80),
    },
    cover:{
        opacity: new Animated.Value(0),
    }
}

export default BottomSheet;