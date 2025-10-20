fn main() {
    #[cfg(feature = "gui")]
    {
        tauri_build::build();
    }

    #[cfg(not(feature = "gui"))]
    {
        println!("cargo:warning=Skipping Tauri build script (no GUI features enabled)");
    }
}
