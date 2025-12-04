/**
 * Tests for ClientIsland component and island registry
 */

import { describe, test, expect, beforeEach } from "bun:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  ClientIsland,
  registerIsland,
  getIsland,
  getIslandRegistry,
} from "../../src/client/island";

// Test component
function TestCounter({ initial = 0 }: { initial?: number }) {
  return <div>Count: {initial}</div>;
}
TestCounter.displayName = "TestCounter";

// Anonymous component for testing
const AnonymousComponent = ({ value }: { value: string }) => <span>{value}</span>;

describe("ClientIsland", () => {
  describe("server rendering", () => {
    test("renders component with data-bunbox-island attribute", () => {
      const html = renderToString(
        <ClientIsland component={TestCounter} props={{ initial: 5 }} />
      );

      expect(html).toContain("data-bunbox-island");
      // React may add hydration comments between text, so check both parts
      expect(html).toContain("Count:");
      expect(html).toContain("5");
    });

    test("includes serialized props as data attribute", () => {
      const html = renderToString(
        <ClientIsland component={TestCounter} props={{ initial: 10 }} />
      );

      expect(html).toContain('data-island-props="');
      // HTML entities are escaped in attributes (" becomes &quot;)
      expect(html).toContain("initial");
      expect(html).toContain("10");
    });

    test("includes component name as data attribute", () => {
      const html = renderToString(
        <ClientIsland component={TestCounter} props={{ initial: 0 }} />
      );

      expect(html).toContain('data-island-component="TestCounter"');
    });

    test("uses 'Anonymous' for components without displayName or name", () => {
      // Create a truly anonymous component using Object.defineProperty
      const Component = ({ value }: { value: string }) => <span>{value}</span>;
      Object.defineProperty(Component, "name", { value: "" });
      Object.defineProperty(Component, "displayName", { value: undefined });

      const html = renderToString(
        <ClientIsland component={Component} props={{ value: "test" }} />
      );

      expect(html).toContain('data-island-component="Anonymous"');
    });

    test("renders with default empty props", () => {
      const SimpleComponent = () => <div>Simple</div>;
      SimpleComponent.displayName = "SimpleComponent";

      const html = renderToString(<ClientIsland component={SimpleComponent} />);

      expect(html).toContain("data-bunbox-island");
      expect(html).toContain("Simple");
      expect(html).toContain('data-island-props="{}"');
    });
  });

  describe("props serialization", () => {
    test("serializes complex props correctly", () => {
      const ComplexComponent = ({
        items,
        config,
      }: {
        items: string[];
        config: { enabled: boolean };
      }) => (
        <div>
          {items.map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      );
      ComplexComponent.displayName = "ComplexComponent";

      const html = renderToString(
        <ClientIsland
          component={ComplexComponent}
          props={{ items: ["a", "b"], config: { enabled: true } }}
        />
      );

      // Props should be JSON serializable
      expect(html).toContain("items");
      expect(html).toContain("config");
      expect(html).toContain("enabled");
    });
  });
});

describe("Island Registry", () => {
  beforeEach(() => {
    // Clear registry before each test
    const registry = getIslandRegistry();
    registry.clear();
  });

  describe("registerIsland", () => {
    test("registers a component with a name", () => {
      registerIsland("TestCounter", TestCounter);

      const retrieved = getIsland("TestCounter");
      expect(retrieved).toBe(TestCounter);
    });

    test("allows registering multiple components", () => {
      const Component1 = () => <div>1</div>;
      const Component2 = () => <div>2</div>;

      registerIsland("Component1", Component1);
      registerIsland("Component2", Component2);

      expect(getIsland("Component1")).toBe(Component1);
      expect(getIsland("Component2")).toBe(Component2);
    });

    test("overwrites existing registration with same name", () => {
      const Original = () => <div>Original</div>;
      const Replacement = () => <div>Replacement</div>;

      registerIsland("MyComponent", Original);
      registerIsland("MyComponent", Replacement);

      expect(getIsland("MyComponent")).toBe(Replacement);
    });
  });

  describe("getIsland", () => {
    test("returns undefined for unregistered component", () => {
      const result = getIsland("NonExistent");
      expect(result).toBeUndefined();
    });

    test("returns registered component", () => {
      registerIsland("TestCounter", TestCounter);

      const result = getIsland("TestCounter");
      expect(result).toBe(TestCounter);
    });
  });

  describe("getIslandRegistry", () => {
    test("returns the full registry map", () => {
      registerIsland("A", () => <div>A</div>);
      registerIsland("B", () => <div>B</div>);

      const registry = getIslandRegistry();

      expect(registry.size).toBe(2);
      expect(registry.has("A")).toBe(true);
      expect(registry.has("B")).toBe(true);
    });

    test("registry is shared across calls", () => {
      registerIsland("Shared", () => <div>Shared</div>);

      const registry1 = getIslandRegistry();
      const registry2 = getIslandRegistry();

      expect(registry1).toBe(registry2);
      expect(registry1.has("Shared")).toBe(true);
    });
  });
});

describe("Island hydration flow", () => {
  beforeEach(() => {
    getIslandRegistry().clear();
  });

  test("server renders island markers that client can hydrate", () => {
    // 1. Register component (client would do this)
    registerIsland("TestCounter", TestCounter);

    // 2. Server renders the island
    const html = renderToString(
      <ClientIsland component={TestCounter} props={{ initial: 42 }} />
    );

    // 3. Verify markers exist for client hydration
    expect(html).toContain("data-bunbox-island");
    expect(html).toContain('data-island-component="TestCounter"');
    // HTML entities are escaped, so check for key content
    expect(html).toContain("initial");
    expect(html).toContain("42");

    // 4. Client can look up component
    const Component = getIsland("TestCounter");
    expect(Component).toBe(TestCounter);
  });

  test("multiple islands can coexist", () => {
    const Counter = ({ count }: { count: number }) => <div>Count: {count}</div>;
    Counter.displayName = "Counter";

    const Button = ({ label }: { label: string }) => (
      <button>{label}</button>
    );
    Button.displayName = "Button";

    registerIsland("Counter", Counter);
    registerIsland("Button", Button);

    const html = renderToString(
      <div>
        <ClientIsland component={Counter} props={{ count: 10 }} />
        <ClientIsland component={Button} props={{ label: "Click" }} />
      </div>
    );

    expect(html).toContain('data-island-component="Counter"');
    expect(html).toContain('data-island-component="Button"');
    // React may add hydration comments, so check parts separately
    expect(html).toContain("Count:");
    expect(html).toContain("10");
    expect(html).toContain("Click");
  });
});
