use corewa_rs::language::{read_champion, write_champion};

fn main() {
    let champion = read_champion(std::io::stdin())
        .expect("Failed to read champion");

    write_champion(std::io::stdout(), champion)
        .expect("Failed to write champion");
}
