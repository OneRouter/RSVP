import React, {
  useState,
  useImperativeHandle,
  useCallback,
  useRef,
} from "react";
import { StyleSheet } from "react-native";
import Animated, {
  interpolate,
  runOnJS,
  withSpring,
  useDerivedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Freeze } from "react-freeze";

import type { MemoExoticComponent } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type {
  ComposedGesture,
  GestureType,
  GestureStateChangeEvent,
  GestureUpdateEvent,
  PanGestureHandlerEventPayload,
} from "react-native-gesture-handler";
import type { WithSpringConfig } from "react-native-reanimated";

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

function slide({
  focusAnim,
  pageWidth,
  pageHeight,
  vertical,
}: PageInterpolatorParams): ReturnType<typeof useAnimatedStyle> {
  "worklet";

  const translateX = vertical
    ? 0
    : interpolate(
        focusAnim.value,
        [-1, 0, 1],
        [-pageWidth.value, 0, pageWidth.value]
      );
  const translateY = vertical
    ? interpolate(
        focusAnim.value,
        [-1, 0, 1],
        [-pageHeight.value, 0, pageHeight.value]
      )
    : 0;

  return {
    transform: [{ translateX }, { translateY }],
  };
}

export const DEFAULT_ANIMATION_CONFIG: WithSpringConfig = {
  damping: 20,
  mass: 0.2,
  stiffness: 100,
  overshootClamping: false,
  restSpeedThreshold: 0.2,
  restDisplacementThreshold: 0.2,
};

function RSVP(
  {
    vertical = false,
    // wrapAround = false, // TODO: Fix wrapAround animation
    data = [],
    pageCallbackNode,
    onPageChange,
    pageBuffer = 1,
    style,
    pageWrapperStyle,
    simultaneousGestures = [],
    enableFreeze = false,
    gesturesDisabled,
    animationConfig = {},
    renderItem,
    flingVelocity = 300,
  }: Props,
  ref: React.ForwardedRef<RSVPImperativeApi>
) {
  const minIndex = 0;
  const maxIndex = data.length - 1;
  const pageWidth = useSharedValue(0);
  const pageHeight = useSharedValue(0);
  const pageSize = vertical ? pageHeight : pageWidth;

  const translate = useSharedValue(0);

  const [curIndex, setCurIndex] = useState(0);
  const pageAnimInternal = useSharedValue(0);
  const pageAnim = pageCallbackNode || pageAnimInternal;

  const slideRef = useRef(slide);
  slideRef.current = slide;

  const curIndexRef = useRef(curIndex);
  curIndexRef.current = curIndex;

  const animCfgRef = useRef(animationConfig);
  animCfgRef.current = animationConfig;

  const setPage = useCallback(
    (index: number, options: ImperativeApiOptions = {}) => {
      const updatedTranslate = index * pageSize.value * -1;
      if (options.animated) {
        const animCfg = {
          ...DEFAULT_ANIMATION_CONFIG,
          ...animCfgRef.current,
        };

        translate.value = withSpring(updatedTranslate, animCfg);
      } else {
        translate.value = updatedTranslate;
      }
    },
    [pageSize, translate]
  );

  useImperativeHandle(
    ref,
    () => ({
      setPage,
      incrementPage: (options?: ImperativeApiOptions) => {
        setPage(curIndexRef.current + 1, options);
      },
      decrementPage: (options?: ImperativeApiOptions) => {
        setPage(curIndexRef.current - 1, options);
      },
    }),
    [setPage]
  );
  const indexArray =
    curIndex > minIndex && curIndex < maxIndex
      ? [curIndex - 1, curIndex, curIndex + 1]
      : curIndex === minIndex
      ? // ? !wrapAround // TODO: Fix wrapAround animation
        [curIndex, curIndex + 1]
      : // : [maxIndex, curIndex, curIndex + 1]
        // : wrapAround
        // ? [curIndex - 1, curIndex, minIndex]
        [curIndex - 1, curIndex];
  const pageIndices = indexArray.map((_, i) => {
    const bufferIndex = curIndex < maxIndex ? i - 1 : i;
    return curIndex - bufferIndex;
  });

  useDerivedValue(() => {
    if (pageSize.value) {
      pageAnim.value = (translate.value / pageSize.value) * -1;
    }
  }, [pageSize, pageAnim, translate]);

  function onPageChangeInternal(pg: number) {
    onPageChange?.(pg);
    setCurIndex(pg);
  }

  useAnimatedReaction(
    () => {
      return Math.round(pageAnim.value);
    },
    (cur, prev) => {
      if (cur !== prev) {
        runOnJS(onPageChangeInternal)(cur);
      }
    },
    []
  );

  const startTranslate = useSharedValue(0);

  const onBegin = () => {
    startTranslate.value = translate.value;
  };
  const onUpdate = (evt: GestureUpdateEvent<PanGestureHandlerEventPayload>) => {
    const evtTranslate = vertical ? evt.translationY : evt.translationX;

    const rawVal = startTranslate.value + evtTranslate;
    const page = -rawVal / pageSize.value;
    if (
      page >= minIndex &&
      page <= maxIndex
      // || wrapAround
    ) {
      translate.value = rawVal;
    }
  };
  const onEnd = (
    evt: GestureStateChangeEvent<PanGestureHandlerEventPayload>
  ) => {
    const evtVelocity = vertical ? evt.velocityY : evt.velocityX;
    const isFling = Math.abs(evtVelocity) > flingVelocity;
    let velocityModifier = isFling ? pageSize.value / 2 : 0;
    if (evtVelocity < 0) velocityModifier *= -1;
    let page =
      -1 * Math.round((translate.value + velocityModifier) / pageSize.value);
    if (page < minIndex) {
      // wrapAround ? page = maxIndex :
      page = minIndex;
    }
    if (page > maxIndex) {
      // wrapAround ? page = minIndex :
      page = maxIndex;
    }

    const animCfg = Object.assign(
      {},
      DEFAULT_ANIMATION_CONFIG,
      animCfgRef.current
    );

    translate.value = withSpring(-page * pageSize.value, animCfg);
  };
  const panGesture = Gesture.Pan()
    .onBegin(onBegin)
    .onUpdate(onUpdate)
    .onEnd(onEnd)
    .enabled(!gesturesDisabled);

  if (!data) {
    throw new Error("RSVP's data prop is required");
  }

  return (
    <GestureDetector
      gesture={Gesture.Simultaneous(panGesture, ...simultaneousGestures)}
    >
      <Animated.View
        style={style}
        onLayout={({ nativeEvent: { layout } }) => {
          pageWidth.value = layout.width;
          pageHeight.value = layout.height;
        }}
      >
        {pageIndices.map((pageIndex) => {
          return (
            <PageWrapper
              key={`page-provider-wrapper-${pageIndex}`}
              vertical={vertical}
              pageAnim={pageAnim}
              index={pageIndex}
              enableFreeze={enableFreeze}
              pageWidth={pageWidth}
              pageHeight={pageHeight}
              isActive={pageIndex === curIndex}
              renderItem={renderItem}
              style={pageWrapperStyle}
              slideRef={slideRef}
              pageBuffer={pageBuffer}
            />
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
}

export default React.memo(React.forwardRef(RSVP));

type PageWrapperProps = {
  vertical: boolean;
  pageAnim: Animated.SharedValue<number>;
  index: number;
  enableFreeze: boolean;
  pageWidth: Animated.SharedValue<number>;
  pageHeight: Animated.SharedValue<number>;
  renderItem?: RenderItemType;
  isActive: boolean;
  style?: AnyStyle;
  slideRef: React.MutableRefObject<typeof slide>;
  pageBuffer: number;
};

export type PageInterpolatorParams = {
  index: number;
  vertical: boolean;
  focusAnim: Animated.DerivedValue<number>;
  pageAnim: Animated.DerivedValue<number>;
  pageWidth: Animated.SharedValue<number>;
  pageHeight: Animated.SharedValue<number>;
  pageBuffer: number;
};

const PageWrapper = React.memo(
  ({
    index,
    enableFreeze,
    pageAnim,
    pageWidth,
    pageHeight,
    vertical,
    renderItem,
    isActive,
    style,
    slideRef,
    pageBuffer,
  }: PageWrapperProps) => {
    const pageSize = vertical ? pageHeight : pageWidth;

    const translation = useDerivedValue(() => {
      const translate = (index - pageAnim.value) * pageSize.value;
      return translate;
    }, []);

    const focusAnim = useDerivedValue(() => {
      if (!pageSize.value) return 99999;
      return translation.value / pageSize.value;
    }, []);

    const animStyle = useAnimatedStyle(() => {
      // Short circuit page interpolation to prevent buggy initial values due to possible race condition:
      // https://github.com/software-mansion/react-native-reanimated/issues/2571
      const isInactivePageBeforeInit = index !== 0 && !pageSize.value;
      const _pageWidth = isInactivePageBeforeInit ? focusAnim : pageWidth;
      const _pageHeight = isInactivePageBeforeInit ? focusAnim : pageHeight;
      return slideRef.current({
        focusAnim,
        pageAnim,
        pageWidth: _pageWidth,
        pageHeight: _pageHeight,
        index,
        vertical,
        pageBuffer,
      });
    }, [
      pageWidth,
      pageHeight,
      pageAnim,
      index,
      translation,
      vertical,
      pageBuffer,
    ]);

    if (!renderItem) {
      throw new Error("RSVP's renderItem prop is required");
    }

    return (
      <Animated.View
        style={[
          style,
          styles.pageWrapper,
          animStyle,
          isActive && styles.activePage,
        ]}
      >
        <Freeze freeze={enableFreeze && !isActive}>
          {renderItem?.({
            index,
            isActive,
            focusAnim,
            pageWidthAnim: pageWidth,
            pageHeightAnim: pageHeight,
            pageAnim,
          })}
        </Freeze>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  pageWrapper: {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    position: "absolute",
  },
  activePage: {
    position: "relative",
  },
});
