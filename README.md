# RSVP

## Reanimated Swipeable ViewPager

Derived from [React Native Infinite Pager](https://github.com/computerjazz/react-native-infinite-pager)

A swipeable horizontal and vertical pager component.

Fully native interactions powered by [Reanimated 2](https://github.com/software-mansion/react-native-reanimated) and [React Native Gesture Handler](https://github.com/software-mansion/react-native-gesture-handler). Optional freeze with [React Freeze](https://github.com/software-mansion/react-freeze)

[RSVP demo](https://snack.expo.dev/@stereoplegic/rsvp)

## Install

1. Follow installation instructions for [reanimated](https://github.com/kmagiera/react-native-reanimated) and [react-native-gesture-handler](https://github.com/kmagiera/react-native-gesture-handler)
2. `npm install` or `yarn add` `@onerouter/rsvp`
3. `import RSVP from '@onerouter/rsvp'`

### Props

```typescript
type PageProps = {
  index: number;
  focusAnim: Animated.DerivedValue<number>;
  isActive: boolean;
  pageWidthAnim: Animated.SharedValue<number>;
  pageHeightAnim: Animated.SharedValue<number>;
  pageAnim: Animated.SharedValue<number>;
};
export type RenderItemType = (props: PageProps) => JSX.Element | null;

export type AnyStyle =
  | StyleProp<ViewStyle>
  | ReturnType<typeof useAnimatedStyle>;

export type Props = {
  vertical?: boolean;
  // wrapAround?: boolean; // TODO: Fix wraparound animation
  data: any[];
  renderItem: RenderItemType | MemoExoticComponent<RenderItemType>;
  pageCallbackNode?: Animated.SharedValue<number>;
  onPageChange?: (page: number) => void;
  pageBuffer?: number; // number of pages to render on either side of active page
  style?: AnyStyle;
  pageWrapperStyle?: AnyStyle;
  simultaneousGestures?: (ComposedGesture | GestureType)[];
  enableFreeze?: boolean;
  gesturesDisabled?: boolean;
  animationConfig?: Partial<WithSpringConfig>;
  flingVelocity?: number;
};
export type ImperativeApiOptions = {
  animated?: boolean;
};

export type RSVPImperativeApi = {
  setPage: (index: number, options: ImperativeApiOptions) => void;
  incrementPage: (options: ImperativeApiOptions) => void;
  decrementPage: (options: ImperativeApiOptions) => void;
};
```

| Name               | Type                     | Description                                     |
| :----------------- | :----------------------- | :---------------------------------------------- |
| `renderItem`    | `RenderItemType`      | (Required) Function to be called to render each page.          |
| `onPageChange`     | `(page: number) => void` | Callback invoked when the current page changes. |
| `style`            | `AnyStyle`               | Style of the pager container.                   |
| `pageWrapperStyle` | `AnyStyle`               | Style of the container that wraps each page.    |
| `pageCallbackNode` | `Animated.SharedValue<number>`               | SharedValue that represents the index of the current page.    |
| `pageBuffer` | `number`               | Number of pages to render on either side of the active page.    |
| `pageInterpolator` | `(params: PageInterpolatorParams) => ReturnType<typeof useAnimatedStyle>`               | Interpolator for custom page animations.    |
| `minIndex`            | `number`               | Minimum page index for non-infinite behavior (optional).                   |
| `maxIndex`            | `number`               | Maximum page index for non-infinite behavior (optional).                   |
| `simultaneousGestures`            | `(ComposedGesture \| GestureType)[]`               | Simultaneous RNGH gestures.                   |
| `gesturesDisabled`            | `boolean`               | Disables pan gestures.                   |
| `animationConfig`            | `Partial<WithSpringConfig>`               | Customizes paging animations.                   |
| `vertical`            | `boolean`               | Sets page gesture to the vertical axis.                   |
| `flingVelocity`            | `number`               | Determines sensitivity of a page-turning "fling" at the end of the gesture.                   |
| `data`            | `any[]`               | (Required) Array from which `renderItem` gets its data (on a per-item basis)                   |

### Imperative API

```typescript
type ImperativeApiOptions = {
  animated?: boolean;
};

export type RSVPImperativeApi = {
  setPage: (index: number, options: ImperativeApiOptions) => void;
  incrementPage: (options: ImperativeApiOptions) => void;
  decrementPage: (options: ImperativeApiOptions) => void;
};
```

| Name            | Type                                                     | Description                |
| :-------------- | :------------------------------------------------------- | :------------------------- |
| `incrementPage` | `(options: ImperativeApiOptions) => void`                | Go to next page.           |
| `decrementPage` | `(options: ImperativeApiOptions) => void`                | Go to previous page.       |
| `setPage`       | `(index: number, options: ImperativeApiOptions) => void` | Go to page of given index. |

### [Example](https://snack.expo.dev/@stereoplegic/rsvp)

```typescript
import React, { useRef, useCallback } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import RSVP, { RSVPImperativeApi } from './Pager';
import RSVP, { RSVPImperativeApi } from '@onerouter/rsvp';

const NUM_ITEMS = 15;

function getColor(i: number) {
  const multiplier = 255 / (NUM_ITEMS - 1);
  const colorVal = Math.abs(i) * multiplier;
  return `rgb(${colorVal}, ${Math.abs(128 - colorVal)}, ${255 - colorVal})`;
}

const data = [0, 1, 2, 3, 4, 5];

const Page = ({ index }: { index: number }) => {
  return (
    <View
      style={[
        styles.flex,
        {
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}>
      <Text style={{ color: 'white', fontSize: 80, fontWeight: 'bold' }}>
        {index}
      </Text>
    </View>
  );
};

export default function App() {
  const pagerRef = useRef<RSVPImperativeApi>(null);
  const pageIndex = useSharedValue(0);
  const renderItem = useCallback(({ index }: { index: number }) => {
    return (
      <Animated.View
        style={[
          styles.flex,
          {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: getColor(index),
          },
        ]}>
        <Text style={{ color: 'white', fontSize: 80, fontWeight: 'bold' }}>
          {index < 0 ? data.length - 1 : index > data.length - 1 ? 0 : index}
        </Text>
      </Animated.View>
    );
  }, []);
  return (
    <GestureHandlerRootView
      style={[styles.flex, { backgroundColor: 'seashell' }]}>
      <RSVP
        data={data}
        enableFreeze={false} // set backgroundColor in RSVP style prop if enabling freeze for smoother transition
        // wrapAround // TODO: fix wrapAround animation
        onPageChange={(page) => (pageIndex.value = page)}
        key={`infinite-pager-${pagerRef.current}`}
        ref={pagerRef}
        renderItem={renderItem}
        style={styles.flex}
        pageWrapperStyle={styles.flex}
        pageBuffer={1}
      />

      <View style={{ position: 'absolute', bottom: 44, left: 0, right: 0 }}>
        <Text
          style={{
            alignSelf: 'center',
            fontWeight: 'bold',
            color: 'rgba(0,0,0,0.33)',
            padding: 5,
            borderRadius: 3,
            fontSize: 24,
          }}>
          Pagination
        </Text>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginTop: 12,
          }}>
          {data.map((item, index) => {
            return (
              <TouchableOpacity
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: 'rgba(0,0,0,0.33)',
                  borderWidth: StyleSheet.hairlineWidth,
                }}
                onPress={() => {
                  pagerRef?.current?.setPage(index, { animated: true });
                }}>
                <Text style={{ color: 'white' }}>{index}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
```
