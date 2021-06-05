mod util;

use std::{error::Error, fs, io};
use termion::{event::Key, input::MouseTerminal, raw::IntoRawMode, screen::AlternateScreen};
use tui::{
    backend::TermionBackend,
    buffer::Buffer,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Style},
    widgets::{Block, Borders, Widget},
    Terminal,
};
use util::{Event, Events};

fn main() {
    let exit_code = match run() {
        Ok(_) => 0,
        Err(err) => {
            println!("{}", err);
            1
        }
    };

    std::process::exit(exit_code)
}

fn run() -> Result<(), Box<dyn Error>> {
    let opts = Options::from_args();

    if opts.champion_files.is_empty() {
        panic!("Require at least 1 champion");
    }

    let mut vm = VirtualMachine::new();
    let players: Vec<_> = opts
        .champion_files
        .iter()
        .enumerate()
        .map(|(i, file_name)| {
            let champion = fs::read(&file_name)?;
            Ok((i as i32 + 1, champion))
        })
        .collect::<Result<_, io::Error>>()?;

    vm.load_players(&players);

    let stdout = io::stdout().into_raw_mode()?;
    let stdout = MouseTerminal::from(stdout);
    let stdout = AlternateScreen::from(stdout);
    let backend = TermionBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;
    terminal.hide_cursor()?;

    let events = Events::new();

    let colors = [Color::Yellow, Color::Magenta, Color::Green, Color::Cyan];

    let player_colors = vm
        .players
        .iter()
        .enumerate()
        .map(|(idx, player)| (player.id, colors[idx]))
        .collect();

    let mut controls = Controls::default();

    loop {
        if controls.running {
            terminal.draw(|mut f| {
                let chunks = Layout::default()
                    .direction(Direction::Horizontal)
                    .margin(1)
                    .constraints([Constraint::Percentage(20), Constraint::Percentage(80)].as_ref())
                    .split(f.size());

                Block::default()
                    .borders(Borders::ALL)
                    .title("VM state")
                    .render(&mut f, chunks[0]);

                let info_chunks = Layout::default()
                    .direction(Direction::Vertical)
                    .margin(1)
                    .constraints([Constraint::Percentage(20), Constraint::Percentage(80)].as_ref())
                    .split(chunks[0]);

                Block::default()
                    .borders(Borders::BOTTOM)
                    .render(&mut f, info_chunks[0]);

                Block::default()
                    .borders(Borders::ALL)
                    .title("Memory")
                    .render(&mut f, chunks[1]);

                let vm_chunks = Layout::default()
                    .constraints([Constraint::Percentage(100)].as_ref())
                    .margin(1)
                    .split(chunks[1]);

                controls.render(&mut f, info_chunks[0]);

                VMStateWidget(&vm).render(&mut f, info_chunks[1]);

                MemoryWidget(&vm, &player_colors, opts.chr).render(&mut f, vm_chunks[0]);
            })?;
        }

        match events.next()? {
            Event::Key(key) => match key {
                Key::Char(c) => match c {
                    'q' => break,
                    '+' => controls.faster(),
                    '-' => controls.slower(),
                    ' ' => controls.toggle_running(),
                    'r' => {
                        vm = VirtualMachine::new();
                        vm.load_players(&players)
                    }
                    _ => (),
                },
                Key::Right => vm.tick(),
                _ => (),
            },
            Event::Mouse(_ev) => {
                // dbg!(ev);
            }
            Event::Tick => {
                if controls.running {
                    for _ in 0..controls.speed {
                        vm.tick();
                    }
                }
            }
        }
    }

    Ok(())
}

struct Controls {
    speed: u16,
    running: bool,
}

impl Default for Controls {
    fn default() -> Self {
        Self {
            speed: 1,
            running: true,
        }
    }
}

impl Controls {
    fn faster(&mut self) {
        self.speed = (self.speed * 2).min(128)
    }

    fn slower(&mut self) {
        self.speed = (self.speed / 2).max(1)
    }

    fn toggle_running(&mut self) {
        self.running = !self.running
    }
}

impl Widget for Controls {
    fn draw(&mut self, area: Rect, buf: &mut Buffer) {
        let running_string = if self.running { "running" } else { "stopped" };
        buf.set_string(area.left(), area.top(), running_string, Style::default());
        buf.set_string(
            area.left(),
            area.top() + 1,
            format!("Speed: x{}", self.speed),
            Style::default(),
        );
    }
}

struct VMStateWidget<'a>(&'a VirtualMachine);

impl Widget for VMStateWidget<'_> {
    fn draw(&mut self, area: Rect, buf: &mut Buffer) {
        let mut line_offset = 0;
        let mut show_line = |text| {
            let x = area.left();
            let y = area.top() + line_offset;
            line_offset += 1;
            buf.set_string(x, y, text, Style::default());
        };

        let vm = &self.0;

        let next_check = vm.check_interval - (vm.cycles - vm.last_live_check);

        show_line(format!("Cycles:         {}", vm.cycles));
        show_line(format!("Process:        {}", vm.processes.len()));
        show_line(format!("Check interval: {}", vm.check_interval));
        show_line(format!("Next check:     {}", next_check));
        show_line(format!("Last check:     {}", vm.last_live_check));
        show_line(format!(
            "Live count:     {}",
            vm.live_count_since_last_check
        ));
        show_line(format!(
            "Checks passed:  {}",
            vm.checks_without_cycle_decrement
        ));
    }
}

struct MemoryWidget<'a>(&'a VirtualMachine, &'a PlayerColors, char);

type PlayerColors = HashMap<PlayerId, Color>;

impl<'a> Widget for MemoryWidget<'a> {
    fn draw(&mut self, area: Rect, buf: &mut Buffer) {
        let mem = &self.0.memory;
        let width = 128.min(area.right() - area.left());

        for idx in 0..mem.size() {
            let y = idx as u16 / width;
            let x = idx as u16 % width;

            if area.top() + y >= area.bottom() {
                break;
            }

            let cell = buf.get_mut(area.left() + x, area.top() + y);

            let player_id = mem.owners[idx];
            let color = if player_id != 0 {
                self.1[&player_id]
            } else {
                Color::DarkGray
            };

            let pc_count = self.0.process_count_per_cells[idx];

            let ch = match pc_count {
                0 => self.2,
                c @ 1..=9 => char::from(b'0' + c as u8),
                _ => '+',
            };
            cell.set_char(ch);
            cell.set_fg(color);
            if pc_count >= 1 {
                cell.set_bg(Color::DarkGray);
            }
        }
    }
}

use corewa_rs::vm::{types::PlayerId, VirtualMachine};
use std::collections::HashMap;
use structopt::StructOpt;

#[derive(Debug, StructOpt)]
struct Options {
    champion_files: Vec<String>,
    #[structopt(short = "c", default_value = "▮")]
    chr: char,
}
