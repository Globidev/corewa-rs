use corewa_rs::{
    language::{read_champion, write_champion},
    spec::HEADER_SIZE,
};

fn main() {
    let exit_code = match run() {
        Ok(_) => 0,
        Err(err) => {
            eprintln!("{}", err);
            1
        }
    };

    std::process::exit(exit_code)
}

fn run() -> Result<(), String> {
    let champion =
        read_champion(std::io::stdin()).map_err(|e| format!("Failed to read champion:\n{}", e))?;

    let champion_name = champion.name.clone();

    let size_written = write_champion(std::io::stdout(), champion)
        .map_err(|e| format!("Failed to write champion:\n{}", e))?;

    eprintln!("Successfully compiled '{}'", champion_name);
    eprintln!("code section: {} bytes", size_written - HEADER_SIZE);

    Ok(())
}
