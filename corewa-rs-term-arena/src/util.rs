use std::{io, sync::mpsc, thread, time::Duration};

use termion::{
    event::{Event as TermEvent, Key, MouseEvent},
    input::TermRead,
};

pub enum Event {
    Key(Key),
    Mouse(MouseEvent),
    Tick,
}

/// A small event handler that wrap termion input and tick events. Each event
/// type is handled in its own thread and returned to a common `Receiver`
pub struct Events {
    rx: mpsc::Receiver<Event>,
    _input_handle: thread::JoinHandle<()>,
    _tick_handle: thread::JoinHandle<()>,
}

#[derive(Debug, Clone, Copy)]
pub struct Config {
    pub exit_key: Key,
    pub tick_rate: Duration,
}

impl Default for Config {
    fn default() -> Config {
        Config {
            exit_key: Key::Char('q'),
            tick_rate: Duration::from_millis(16),
        }
    }
}

impl Events {
    pub fn new() -> Events {
        Events::with_config(Config::default())
    }

    pub fn with_config(config: Config) -> Events {
        let (tx, rx) = mpsc::channel();
        let input_handle = {
            let tx = tx.clone();
            thread::spawn(move || {
                let stdin = io::stdin();
                for evt in stdin.events().flatten() {
                    match evt {
                        TermEvent::Key(key) => {
                            if let Err(_) = tx.send(Event::Key(key)) {
                                return;
                            }
                            if key == config.exit_key {
                                return;
                            }
                        }
                        TermEvent::Mouse(ev) => {
                            if let Err(_) = tx.send(Event::Mouse(ev)) {
                                return;
                            }
                        }
                        _ => {}
                    }
                }
            })
        };
        let tick_handle = {
            let tx = tx.clone();
            thread::spawn(move || {
                let tx = tx.clone();
                loop {
                    tx.send(Event::Tick).unwrap();
                    thread::sleep(config.tick_rate);
                }
            })
        };
        Events {
            rx,
            _input_handle: input_handle,
            _tick_handle: tick_handle,
        }
    }

    pub fn next(&self) -> Result<Event, mpsc::RecvError> {
        self.rx.recv()
    }
}
