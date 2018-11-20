fn main() {
    use corewar::language::{read_champion, write_champion};

    let champion = read_champion(std::io::stdin())
        .expect("Failed to read champion");

    write_champion(std::io::stdout(), &champion)
        .expect("Failed to write champion");
}
