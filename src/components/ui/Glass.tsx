/**
 * Frosted glass on every platform. On the web it is a CSS backdrop blur on
 * the glass itself (see `glassBlurStyle`); on iOS and Android a BlurView is
 * laid under the glass's content, with the glass's tint drawn over it.
 *
 * Android can only blur a BlurTargetView it is not inside: a screen wraps
 * what shows through its glass in a `GlassTarget` and hands that down in
 * `GlassTargetContext`. Glass with no target there, or on Android before 12
 * (where the blur would be slow), keeps the plain see-through tint.
 */
import { BlurTargetView, BlurView } from "expo-blur";
import {
  createContext,
  type ComponentProps,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type GlassTargetRef = RefObject<View | null>;

/** What the glass under it blurs, on Android. */
export const GlassTargetContext = createContext<GlassTargetRef | null>(null);

/** The web's blur, and as close as the native blur gets to it. */
const WEB_BLUR = "blur(14px)";
const NATIVE_INTENSITY = 50;

/**
 * Whether glass is blurred natively: always on iOS; on Android 12 and later
 * (where the blur is quick) when there is a target to blur; never on the
 * web, which blurs with CSS instead.
 */
export function hasNativeGlass(
  os: string,
  version: number | string,
  hasTarget: boolean,
) {
  if (os === "ios") return true;
  return os === "android" && Number(version) >= 31 && hasTarget;
}

/** The backdrop blur for glass on the web; nothing elsewhere. */
export function glassBlurStyle(): ViewStyle {
  return Platform.OS === "web"
    ? ({ backdropFilter: WEB_BLUR } as ViewStyle)
    : {};
}

/**
 * Whether a `GlassBackdrop` draws here. When it does, it draws the glass's
 * tint too, so the glass itself is left clear.
 */
export function useNativeGlass() {
  const target = useContext(GlassTargetContext);
  return hasNativeGlass(Platform.OS, Platform.Version, !!target);
}

/**
 * What glass blurs, on Android: everything inside it. (Elsewhere the blur
 * sees through by itself, so this adds nothing.) The glass must be outside
 * it, and given `targetRef` in `GlassTargetContext`.
 */
export function GlassTarget({
  targetRef,
  style,
  children,
}: {
  targetRef: GlassTargetRef;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  if (Platform.OS !== "android") return <>{children}</>;
  return (
    <BlurTargetView ref={targetRef} collapsable={false} style={style}>
      {children}
    </BlurTargetView>
  );
}

/**
 * The blur and tint under a piece of glass: its first child, filling it and
 * rounded like it. Draws nothing on the web, or where `useNativeGlass` says
 * there is no native blur.
 */
export function GlassBackdrop({
  fill,
  radius = 0,
}: {
  /** The glass's tint, drawn over the blur. */
  fill: string;
  radius?: number;
}) {
  const target = useContext(GlassTargetContext);
  const native = useNativeGlass();
  // The BlurView reads its target once, as it mounts, so it waits a render
  // for the target (which may come later in the tree) to be in place.
  const [ready, setReady] = useState(Platform.OS === "ios");
  useEffect(() => setReady(true), []);
  if (!native) return null;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: radius, overflow: "hidden", pointerEvents: "none" },
      ]}
    >
      {ready && (
        <BlurView
          intensity={NATIVE_INTENSITY}
          tint="dark"
          {...(Platform.OS === "android" && target
            ? {
                blurTarget: target,
                blurMethod: "dimezisBlurViewSdk31Plus" as const,
              }
            : null)}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
    </View>
  );
}

/** A View of glass: the tint, the blur under it, and its content on top. */
export function GlassView({
  fill,
  radius,
  style,
  children,
  ...props
}: Omit<ComponentProps<typeof View>, "style"> & {
  fill: string;
  radius: number;
  style?: StyleProp<ViewStyle>;
}) {
  const native = useNativeGlass();
  return (
    <View
      {...props}
      style={[
        {
          borderRadius: radius,
          backgroundColor: native ? "transparent" : fill,
          ...glassBlurStyle(),
        },
        style,
      ]}
    >
      <GlassBackdrop fill={fill} radius={radius} />
      {children}
    </View>
  );
}
