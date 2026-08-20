use serde::Serialize;
use tauri::{AppHandle, WebviewWindow};

const WINDOWS_11_BUILD: u32 = 22_000;
const WINDOWS_11_22H2_BUILD: u32 = 22_621;
const CAPTION_BUTTON_WIDTH: i32 = 46;
const TITLE_BAR_HEIGHT: i32 = 48;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowsCapabilities {
    pub is_windows: bool,
    pub build_number: u32,
    pub composition_enabled: bool,
    pub supports_mica: bool,
    pub supports_desktop_acrylic: bool,
    pub supports_rounded_corners: bool,
    pub supports_snap_layouts: bool,
}

impl WindowsCapabilities {
    #[cfg(not(windows))]
    fn unsupported() -> Self {
        Self {
            is_windows: false,
            build_number: 0,
            composition_enabled: false,
            supports_mica: false,
            supports_desktop_acrylic: false,
            supports_rounded_corners: false,
            supports_snap_layouts: false,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
enum CaptionButton {
    Maximize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptionState {
    focused: bool,
    maximized: bool,
    hovered: Option<CaptionButton>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CaptionHoverState {
    hovered: Option<CaptionButton>,
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct CaptionGeometry {
    client_top: i32,
    client_right: i32,
    dpi: u32,
}

impl CaptionGeometry {
    fn scaled(&self, logical: i32) -> i32 {
        ((logical as i64 * self.dpi.max(96) as i64) / 96) as i32
    }

    fn is_maximize_button(&self, screen_x: i32, screen_y: i32) -> bool {
        let button_width = self.scaled(CAPTION_BUTTON_WIDTH);
        let title_bar_height = self.scaled(TITLE_BAR_HEIGHT);
        let left = self.client_right - button_width * 2;
        let right = self.client_right - button_width;

        screen_x >= left
            && screen_x < right
            && screen_y >= self.client_top
            && screen_y < self.client_top + title_bar_height
    }
}

pub fn initialize(window: &WebviewWindow, app: AppHandle) -> Result<(), String> {
    #[cfg(windows)]
    {
        platform::initialize(window, app)
    }

    #[cfg(not(windows))]
    {
        let _ = (window, app);
        Ok(())
    }
}

#[tauri::command]
pub fn get_windows_capabilities() -> Result<WindowsCapabilities, String> {
    #[cfg(windows)]
    {
        Ok(platform::capabilities())
    }

    #[cfg(not(windows))]
    {
        Ok(WindowsCapabilities::unsupported())
    }
}

#[tauri::command]
pub fn set_windows_appearance(
    window: WebviewWindow,
    color_mode: String,
    effects_enabled: bool,
) -> Result<(), String> {
    #[cfg(windows)]
    {
        platform::set_appearance(&window, &color_mode, effects_enabled)
    }

    #[cfg(not(windows))]
    {
        let _ = (window, color_mode, effects_enabled);
        Ok(())
    }
}

#[tauri::command]
pub fn show_windows_system_menu(window: WebviewWindow, x: f64, y: f64) -> Result<(), String> {
    #[cfg(windows)]
    {
        platform::show_system_menu(&window, x, y)
    }

    #[cfg(not(windows))]
    {
        let _ = (window, x, y);
        Ok(())
    }
}

#[tauri::command]
pub fn start_windows_drag(window: WebviewWindow) -> Result<(), String> {
    #[cfg(windows)]
    {
        window.start_dragging().map_err(|error| error.to_string())
    }

    #[cfg(not(windows))]
    {
        let _ = window;
        Ok(())
    }
}

#[cfg(windows)]
mod platform {
    use super::*;
    use std::mem::size_of;
    use tauri::Emitter;
    use windows::core::w;
    use windows::Win32::Foundation::{HWND, LPARAM, LRESULT, POINT, RECT, WPARAM};
    use windows::Win32::Graphics::Dwm::{
        DwmDefWindowProc, DwmIsCompositionEnabled, DwmSetWindowAttribute, DWMSBT_NONE,
        DWMSBT_MAINWINDOW, DWMWA_SYSTEMBACKDROP_TYPE, DWMWA_USE_IMMERSIVE_DARK_MODE,
        DWMWA_WINDOW_CORNER_PREFERENCE,
    };
    use windows::Win32::Graphics::Gdi::ClientToScreen;
    use windows::Win32::UI::HiDpi::GetDpiForWindow;
    use windows::Win32::UI::Input::KeyboardAndMouse::{
        TrackMouseEvent, TME_LEAVE, TME_NONCLIENT, TRACKMOUSEEVENT,
    };
    use windows::Win32::UI::Shell::{
        DefSubclassProc, GetWindowSubclass, RemoveWindowSubclass, SetWindowSubclass,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        CreateWindowExW, DestroyWindow, GetClientRect, GetSystemMenu, IsZoomed, LoadCursorW,
        PostMessageW, SendMessageW, SetCursor, SetWindowPos, TrackPopupMenu, HTMAXBUTTON, HWND_TOP,
        IDC_ARROW, SC_MAXIMIZE, SC_RESTORE, SIZE_MAXIMIZED, SIZE_RESTORED, SWP_NOACTIVATE,
        SWP_SHOWWINDOW, TPM_LEFTALIGN, TPM_RETURNCMD, TPM_RIGHTBUTTON, WINDOW_EX_STYLE,
        WM_ACTIVATE, WM_NCDESTROY, WM_NCHITTEST, WM_NCLBUTTONDOWN, WM_NCLBUTTONUP, WM_NCMOUSELEAVE,
        WM_NCMOUSEMOVE, WM_SETCURSOR, WM_SIZE, WM_SYSCOMMAND, WS_CHILD, WS_VISIBLE,
    };

    const SUBCLASS_ID: usize = 0x5645_5242;
    const SNAP_OVERLAY_SUBCLASS_ID: usize = 0x5645_534e;
    const DWMWCP_ROUND: i32 = 2;

    #[repr(C)]
    struct RtlOsVersionInfo {
        size: u32,
        major: u32,
        minor: u32,
        build: u32,
        platform_id: u32,
        service_pack: [u16; 128],
    }

    #[link(name = "ntdll")]
    extern "system" {
        fn RtlGetVersion(version: *mut RtlOsVersionInfo) -> i32;
    }

    struct CaptionBridgeState {
        app: AppHandle,
        focused: bool,
        maximized: bool,
        hovered: Option<CaptionButton>,
        snap_overlay: HWND,
    }

    struct SnapOverlayState {
        app: AppHandle,
        parent_hwnd: HWND,
        hovering: bool,
    }

    impl SnapOverlayState {
        fn set_hovering(&mut self, hovering: bool) {
            if self.hovering == hovering {
                return;
            }

            self.hovering = hovering;
            let _ = self.app.emit_to(
                "main",
                "windows-caption-hover-state",
                CaptionHoverState {
                    hovered: hovering.then_some(CaptionButton::Maximize),
                },
            );
        }
    }

    impl CaptionBridgeState {
        fn emit(&self) {
            let _ = self.app.emit_to(
                "main",
                "windows-caption-state",
                CaptionState {
                    focused: self.focused,
                    maximized: self.maximized,
                    hovered: self.hovered,
                },
            );
        }

        fn set_hovered(&mut self, hovered: Option<CaptionButton>) {
            if self.hovered != hovered {
                self.hovered = hovered;
                self.emit();
            }
        }
    }

    pub fn initialize(window: &WebviewWindow, app: AppHandle) -> Result<(), String> {
        window.set_shadow(true).map_err(|error| error.to_string())?;

        let capabilities = capabilities();
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        let is_dark = matches!(window.theme(), Ok(tauri::Theme::Dark));
        if capabilities.supports_mica {
            apply_system_backdrop(hwnd, is_dark, true)?;
        }
        apply_rounded_corners(hwnd);
        install_caption_bridge(hwnd, app)
    }

    pub fn capabilities() -> WindowsCapabilities {
        let build_number = windows_build_number();
        let composition_enabled = unsafe {
            DwmIsCompositionEnabled()
                .map(|enabled| enabled.as_bool())
                .unwrap_or(false)
        };

        WindowsCapabilities {
            is_windows: true,
            build_number,
            composition_enabled,
            supports_mica: build_number >= WINDOWS_11_22H2_BUILD && composition_enabled,
            supports_desktop_acrylic: build_number >= WINDOWS_11_22H2_BUILD && composition_enabled,
            supports_rounded_corners: build_number >= WINDOWS_11_BUILD && composition_enabled,
            supports_snap_layouts: build_number >= WINDOWS_11_BUILD,
        }
    }

    pub fn set_appearance(
        window: &WebviewWindow,
        color_mode: &str,
        effects_enabled: bool,
    ) -> Result<(), String> {
        let capabilities = capabilities();
        let dark = match color_mode {
            "dark" => true,
            "light" => false,
            _ => return Err(format!("Unsupported Windows color mode: {color_mode}")),
        };

        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        if !capabilities.supports_mica {
            return Ok(());
        }
        apply_system_backdrop(
            hwnd,
            dark,
            effects_enabled && capabilities.supports_mica,
        )?;
        refresh_snap_overlay(hwnd);
        Ok(())
    }

    pub fn show_system_menu(window: &WebviewWindow, x: f64, y: f64) -> Result<(), String> {
        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        let scale_factor = window.scale_factor().map_err(|error| error.to_string())?;
        let screen_x = (x * scale_factor).round() as i32;
        let screen_y = (y * scale_factor).round() as i32;

        unsafe {
            let menu = GetSystemMenu(hwnd, false);
            if menu.is_invalid() {
                return Err("Windows did not provide a system menu".into());
            }

            let command = TrackPopupMenu(
                menu,
                TPM_LEFTALIGN | TPM_RIGHTBUTTON | TPM_RETURNCMD,
                screen_x,
                screen_y,
                Some(0),
                hwnd,
                None,
            );

            if command.0 > 0 {
                PostMessageW(
                    Some(hwnd),
                    WM_SYSCOMMAND,
                    WPARAM(command.0 as usize),
                    LPARAM(0),
                )
                .map_err(|error| error.to_string())?;
            }
        }

        Ok(())
    }

    fn windows_build_number() -> u32 {
        let mut version = RtlOsVersionInfo {
            size: size_of::<RtlOsVersionInfo>() as u32,
            major: 0,
            minor: 0,
            build: 0,
            platform_id: 0,
            service_pack: [0; 128],
        };

        let status = unsafe { RtlGetVersion(&mut version) };
        if status >= 0 {
            version.build
        } else {
            0
        }
    }

    fn apply_rounded_corners(hwnd: HWND) {
        let preference = DWMWCP_ROUND;
        unsafe {
            let _ = DwmSetWindowAttribute(
                hwnd,
                DWMWA_WINDOW_CORNER_PREFERENCE,
                &preference as *const _ as _,
                size_of::<i32>() as u32,
            );
        }
    }

    fn system_backdrop_type(enabled: bool) -> windows::Win32::Graphics::Dwm::DWM_SYSTEMBACKDROP_TYPE {
        if enabled {
            DWMSBT_MAINWINDOW
        } else {
            DWMSBT_NONE
        }
    }

    fn apply_system_backdrop(hwnd: HWND, dark: bool, enabled: bool) -> Result<(), String> {
        let dark_mode = u32::from(dark);
        // Verbum is a long-lived document window. MAINWINDOW maps to base
        // Mica on Windows 11, preserving the wallpaper-derived tint without
        // sampling other windows underneath Verbum.
        let backdrop = system_backdrop_type(enabled);

        unsafe {
            DwmSetWindowAttribute(
                hwnd,
                DWMWA_USE_IMMERSIVE_DARK_MODE,
                &dark_mode as *const _ as _,
                size_of::<u32>() as u32,
            )
            .map_err(|error| format!("Unable to apply the Windows color mode: {error}"))?;

            DwmSetWindowAttribute(
                hwnd,
                DWMWA_SYSTEMBACKDROP_TYPE,
                &backdrop as *const _ as _,
                size_of_val(&backdrop) as u32,
            )
            .map_err(|error| format!("Unable to apply the Windows system backdrop: {error}"))?;
        }

        Ok(())
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn long_lived_window_uses_mica_backdrop() {
            assert_eq!(system_backdrop_type(true), DWMSBT_MAINWINDOW);
            assert_eq!(system_backdrop_type(false), DWMSBT_NONE);
        }
    }

    fn install_caption_bridge(hwnd: HWND, app: AppHandle) -> Result<(), String> {
        let snap_overlay = create_snap_overlay(hwnd, app.clone())?;
        let state = Box::new(CaptionBridgeState {
            app,
            focused: true,
            maximized: false,
            hovered: None,
            snap_overlay,
        });
        let state_ptr = Box::into_raw(state);
        let installed = unsafe {
            SetWindowSubclass(
                hwnd,
                Some(caption_subclass_proc),
                SUBCLASS_ID,
                state_ptr as usize,
            )
        };

        if !installed.as_bool() {
            unsafe {
                let _ = DestroyWindow(snap_overlay);
                drop(Box::from_raw(state_ptr));
            }
            return Err("Unable to install the Windows caption bridge".into());
        }

        Ok(())
    }

    fn create_snap_overlay(parent_hwnd: HWND, app: AppHandle) -> Result<HWND, String> {
        let (x, y, width, height) = snap_overlay_bounds(parent_hwnd)?;
        let child = unsafe {
            CreateWindowExW(
                WINDOW_EX_STYLE(0),
                w!("STATIC"),
                None,
                WS_CHILD | WS_VISIBLE,
                x,
                y,
                width,
                height,
                Some(parent_hwnd),
                None,
                None,
                None,
            )
        }
        .map_err(|error| format!("Unable to create the Windows Snap overlay: {error}"))?;

        let state = Box::new(SnapOverlayState {
            app,
            parent_hwnd,
            hovering: false,
        });
        let state_ptr = Box::into_raw(state);
        let installed = unsafe {
            SetWindowSubclass(
                child,
                Some(snap_overlay_subclass_proc),
                SNAP_OVERLAY_SUBCLASS_ID,
                state_ptr as usize,
            )
        };

        if !installed.as_bool() {
            unsafe {
                drop(Box::from_raw(state_ptr));
                let _ = DestroyWindow(child);
            }
            return Err("Unable to install the Windows Snap overlay".into());
        }

        position_snap_overlay(parent_hwnd, child);
        Ok(child)
    }

    fn snap_overlay_bounds(parent_hwnd: HWND) -> Result<(i32, i32, i32, i32), String> {
        let mut client_rect = RECT::default();
        unsafe { GetClientRect(parent_hwnd, &mut client_rect) }
            .map_err(|error| format!("Unable to measure the Windows title bar: {error}"))?;

        let dpi = unsafe { GetDpiForWindow(parent_hwnd) }.max(96);
        let scaled = |logical: i32| ((logical as i64 * dpi as i64 + 48) / 96) as i32;
        let width = scaled(CAPTION_BUTTON_WIDTH);
        let height = scaled(TITLE_BAR_HEIGHT);
        Ok((client_rect.right - width * 2, 0, width, height))
    }

    fn position_snap_overlay(parent_hwnd: HWND, child: HWND) {
        if let Ok((x, y, width, height)) = snap_overlay_bounds(parent_hwnd) {
            unsafe {
                let _ = SetWindowPos(
                    child,
                    Some(HWND_TOP),
                    x,
                    y,
                    width,
                    height,
                    SWP_NOACTIVATE | SWP_SHOWWINDOW,
                );
            }
        }
    }

    fn refresh_snap_overlay(parent_hwnd: HWND) {
        let mut reference_data = 0usize;
        let installed = unsafe {
            GetWindowSubclass(
                parent_hwnd,
                Some(caption_subclass_proc),
                SUBCLASS_ID,
                Some(&mut reference_data),
            )
        };
        if installed.as_bool() && reference_data != 0 {
            let state = unsafe { &*(reference_data as *const CaptionBridgeState) };
            position_snap_overlay(parent_hwnd, state.snap_overlay);
        }
    }

    unsafe extern "system" fn caption_subclass_proc(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        _subclass_id: usize,
        reference_data: usize,
    ) -> LRESULT {
        let state = &mut *(reference_data as *mut CaptionBridgeState);

        match message {
            WM_ACTIVATE => {
                state.focused = (wparam.0 & 0xffff) != 0;
                state.emit();
            }
            WM_SIZE => {
                position_snap_overlay(hwnd, state.snap_overlay);
                if wparam.0 as u32 == SIZE_MAXIMIZED {
                    state.maximized = true;
                    state.emit();
                } else if wparam.0 as u32 == SIZE_RESTORED {
                    state.maximized = false;
                    state.emit();
                }
            }
            WM_NCMOUSEMOVE => {
                let hovered = if wparam.0 as u32 == HTMAXBUTTON {
                    Some(CaptionButton::Maximize)
                } else {
                    None
                };
                state.set_hovered(hovered);

                let mut tracking = TRACKMOUSEEVENT {
                    cbSize: size_of::<TRACKMOUSEEVENT>() as u32,
                    dwFlags: TME_LEAVE | TME_NONCLIENT,
                    hwndTrack: hwnd,
                    dwHoverTime: 0,
                };
                let _ = TrackMouseEvent(&mut tracking);
            }
            WM_NCMOUSELEAVE => state.set_hovered(None),
            WM_NCLBUTTONUP if wparam.0 as u32 == HTMAXBUTTON => {
                let system_command = if IsZoomed(hwnd).as_bool() {
                    SC_RESTORE
                } else {
                    SC_MAXIMIZE
                };
                let _ = PostMessageW(
                    Some(hwnd),
                    WM_SYSCOMMAND,
                    WPARAM(system_command as usize),
                    LPARAM(0),
                );
                return LRESULT(0);
            }
            WM_NCDESTROY => {
                let _ = DestroyWindow(state.snap_overlay);
                let _ = RemoveWindowSubclass(hwnd, Some(caption_subclass_proc), SUBCLASS_ID);
                drop(Box::from_raw(reference_data as *mut CaptionBridgeState));
                return DefSubclassProc(hwnd, message, wparam, lparam);
            }
            _ => {}
        }

        // DWM must see non-client hit tests so it can run its native caption
        // behavior. We still override its preliminary HTCLIENT result over the
        // app-rendered maximize control; HTMAXBUTTON is what lets Windows own
        // hover timing and display the Snap Layout flyout.
        let mut dwm_result = LRESULT(0);
        let dwm_handled =
            DwmDefWindowProc(hwnd, message, wparam, lparam, &mut dwm_result).as_bool();

        if message == WM_NCHITTEST {
            let screen_x = lparam.0 as i16 as i32;
            let screen_y = (lparam.0 >> 16) as i16 as i32;
            let mut client_rect = RECT::default();
            let mut client_origin = POINT::default();
            if GetClientRect(hwnd, &mut client_rect).is_ok()
                && ClientToScreen(hwnd, &mut client_origin).as_bool()
            {
                let geometry = CaptionGeometry {
                    client_top: client_origin.y,
                    client_right: client_origin.x + client_rect.right,
                    dpi: GetDpiForWindow(hwnd),
                };
                if geometry.is_maximize_button(screen_x, screen_y) {
                    return LRESULT(HTMAXBUTTON as isize);
                }
            }
        }

        if dwm_handled {
            return dwm_result;
        }

        DefSubclassProc(hwnd, message, wparam, lparam)
    }

    unsafe extern "system" fn snap_overlay_subclass_proc(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
        subclass_id: usize,
        reference_data: usize,
    ) -> LRESULT {
        let state_ptr = reference_data as *mut SnapOverlayState;

        match message {
            WM_NCHITTEST if !state_ptr.is_null() => {
                let state = &mut *state_ptr;
                state.set_hovering(true);

                let mut tracking = TRACKMOUSEEVENT {
                    cbSize: size_of::<TRACKMOUSEEVENT>() as u32,
                    dwFlags: TME_LEAVE | TME_NONCLIENT,
                    hwndTrack: hwnd,
                    dwHoverTime: 0,
                };
                let _ = TrackMouseEvent(&mut tracking);
                return LRESULT(HTMAXBUTTON as isize);
            }
            WM_NCMOUSELEAVE if !state_ptr.is_null() => {
                (&mut *state_ptr).set_hovering(false);
            }
            WM_NCLBUTTONDOWN if wparam.0 as u32 == HTMAXBUTTON => return LRESULT(0),
            WM_NCLBUTTONUP if wparam.0 as u32 == HTMAXBUTTON && !state_ptr.is_null() => {
                let state = &*state_ptr;
                let system_command = if IsZoomed(state.parent_hwnd).as_bool() {
                    SC_RESTORE
                } else {
                    SC_MAXIMIZE
                };
                SendMessageW(
                    state.parent_hwnd,
                    WM_SYSCOMMAND,
                    Some(WPARAM(system_command as usize)),
                    Some(LPARAM(0)),
                );
                return LRESULT(0);
            }
            WM_SETCURSOR => {
                if let Ok(cursor) = LoadCursorW(None, IDC_ARROW) {
                    SetCursor(Some(cursor));
                    return LRESULT(1);
                }
            }
            WM_NCDESTROY => {
                let _ = RemoveWindowSubclass(hwnd, Some(snap_overlay_subclass_proc), subclass_id);
                if !state_ptr.is_null() {
                    drop(Box::from_raw(state_ptr));
                }
                return DefSubclassProc(hwnd, message, wparam, lparam);
            }
            _ => {}
        }

        DefSubclassProc(hwnd, message, wparam, lparam)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maximize_hit_target_scales_with_dpi() {
        for dpi in [96, 120, 144, 192] {
            let geometry = CaptionGeometry {
                client_top: 0,
                client_right: 1200,
                dpi,
            };
            let width = geometry.scaled(CAPTION_BUTTON_WIDTH);
            let center_x = 1200 - width - width / 2;
            let center_y = geometry.scaled(TITLE_BAR_HEIGHT) / 2;

            assert!(geometry.is_maximize_button(center_x, center_y));
            assert!(!geometry.is_maximize_button(1200 - width / 2, center_y));
        }
    }

    #[test]
    fn maximize_hit_target_respects_window_origin() {
        let geometry = CaptionGeometry {
            client_top: 200,
            client_right: -400,
            dpi: 144,
        };
        let width = geometry.scaled(CAPTION_BUTTON_WIDTH);

        assert!(geometry.is_maximize_button(
            -400 - width - width / 2,
            200 + geometry.scaled(TITLE_BAR_HEIGHT) / 2,
        ));
        assert!(!geometry.is_maximize_button(-401, 199));
    }
}
