"use client";
import { Component, type ReactNode } from "react";

/** If the live gallery cannot start (its code fails to load, no context to
 *  be had), it hands over to the poster wall instead of taking the section
 *  down with it. */
export class Fallback extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
