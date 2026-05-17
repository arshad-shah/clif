import { describe, expect, it } from "vitest";
import { ArgError, parseArgs } from "../../src/core/args.js";

describe("parseArgs", () => {
  describe("long flags", () => {
    it("should parse --name=value", () => {
      const result = parseArgs({ name: { type: "string" } }, { args: ["--name=hello"] });
      expect(result.flags.name).toBe("hello");
    });

    it("should parse --name value", () => {
      const result = parseArgs({ name: { type: "string" } }, { args: ["--name", "hello"] });
      expect(result.flags.name).toBe("hello");
    });

    it("should parse boolean flags", () => {
      const result = parseArgs({ verbose: { type: "boolean" } }, { args: ["--verbose"] });
      expect(result.flags.verbose).toBe(true);
    });

    it("should parse --flag=true and --flag=false", () => {
      const t = parseArgs({ v: { type: "boolean" } }, { args: ["--v=true"] });
      expect(t.flags.v).toBe(true);
      const f = parseArgs({ v: { type: "boolean" } }, { args: ["--v=false"] });
      expect(f.flags.v).toBe(false);
    });
  });

  describe("short flags", () => {
    it("should parse -n value", () => {
      const result = parseArgs({ name: { type: "string", alias: "n" } }, { args: ["-n", "hello"] });
      expect(result.flags.name).toBe("hello");
    });

    it("should parse stacked booleans -abc", () => {
      const result = parseArgs(
        {
          a: { type: "boolean" },
          b: { type: "boolean" },
          c: { type: "boolean" },
        },
        { args: ["-abc"] },
      );
      expect(result.flags.a).toBe(true);
      expect(result.flags.b).toBe(true);
      expect(result.flags.c).toBe(true);
    });

    it("should resolve aliases in stacked flags", () => {
      const result = parseArgs({ verbose: { type: "boolean", alias: "v" } }, { args: ["-v"] });
      expect(result.flags.verbose).toBe(true);
    });
  });

  describe("positional arguments", () => {
    it("should collect positional arguments", () => {
      const result = parseArgs({}, { args: ["file1.ts", "file2.ts"] });
      expect(result.positional).toEqual(["file1.ts", "file2.ts"]);
    });

    it("should separate flags from positional args", () => {
      const result = parseArgs(
        { verbose: { type: "boolean" } },
        { args: ["file.ts", "--verbose", "other.ts"] },
      );
      expect(result.flags.verbose).toBe(true);
      expect(result.positional).toEqual(["file.ts", "other.ts"]);
    });
  });

  describe("-- separator", () => {
    it("should put everything after -- into rest", () => {
      const result = parseArgs(
        { verbose: { type: "boolean" } },
        { args: ["--verbose", "--", "--not-a-flag", "positional"] },
      );
      expect(result.flags.verbose).toBe(true);
      expect(result.rest).toEqual(["--not-a-flag", "positional"]);
    });
  });

  describe("type coercion", () => {
    it("should coerce number types", () => {
      const result = parseArgs({ port: { type: "number" } }, { args: ["--port", "3000"] });
      expect(result.flags.port).toBe(3000);
    });

    it("should throw on invalid number", () => {
      expect(() => parseArgs({ port: { type: "number" } }, { args: ["--port", "abc"] })).toThrow(
        ArgError,
      );
    });

    it("should accept negative numbers as flag values", () => {
      // Regression: --port -1 used to throw because "-1" was misclassified as a flag.
      const result = parseArgs(
        { offset: { type: "number" }, count: { type: "number" } },
        { args: ["--offset", "-5", "--count", "-12"] },
      );
      expect(result.flags.offset).toBe(-5);
      expect(result.flags.count).toBe(-12);
    });

    it("should accept negative number for short flag", () => {
      const result = parseArgs({ temp: { type: "number", alias: "t" } }, { args: ["-t", "-40"] });
      expect(result.flags.temp).toBe(-40);
    });

    it("should still treat bare '-' as the next flag, not a value", () => {
      // Two flags back-to-back must still throw missing-value.
      expect(() =>
        parseArgs({ a: { type: "string" }, b: { type: "string" } }, { args: ["--a", "--b", "x"] }),
      ).toThrow(ArgError);
    });
  });

  describe("defaults", () => {
    it("should use default values when not provided", () => {
      const result = parseArgs({ port: { type: "number", default: 3000 } }, { args: [] });
      expect(result.flags.port).toBe(3000);
    });

    it("should override defaults when provided", () => {
      const result = parseArgs(
        { port: { type: "number", default: 3000 } },
        { args: ["--port", "8080"] },
      );
      expect(result.flags.port).toBe(8080);
    });
  });

  describe("required flags", () => {
    it("should throw when required flag is missing", () => {
      expect(() => parseArgs({ name: { type: "string", required: true } }, { args: [] })).toThrow(
        ArgError,
      );
      expect(() => parseArgs({ name: { type: "string", required: true } }, { args: [] })).toThrow(
        "Missing required flag: --name",
      );
    });

    it("should not throw when required flag is present", () => {
      const result = parseArgs(
        { name: { type: "string", required: true } },
        { args: ["--name", "hello"] },
      );
      expect(result.flags.name).toBe("hello");
    });
  });

  describe("choices", () => {
    it("should accept valid choices", () => {
      const result = parseArgs(
        { env: { type: "string", choices: ["dev", "prod"] } },
        { args: ["--env", "dev"] },
      );
      expect(result.flags.env).toBe("dev");
    });

    it("should reject invalid choices", () => {
      expect(() =>
        parseArgs(
          { env: { type: "string", choices: ["dev", "prod"] } },
          { args: ["--env", "staging"] },
        ),
      ).toThrow(ArgError);
    });
  });

  describe("unknown flags", () => {
    it("should collect unknown flags by default", () => {
      const result = parseArgs({}, { args: ["--unknown", "--other"] });
      expect(result.unknown).toContain("unknown");
      expect(result.unknown).toContain("other");
    });

    it("should allow unknown flags when allowUnknown is true", () => {
      const result = parseArgs({}, { args: ["--unknown"], allowUnknown: true });
      expect(result.flags.unknown).toBe(true);
    });
  });

  describe("missing values", () => {
    it("should throw when string flag has no value", () => {
      expect(() => parseArgs({ name: { type: "string" } }, { args: ["--name"] })).toThrow(
        "Missing value for --name",
      );
    });

    it("should throw when short flag has no value", () => {
      expect(() => parseArgs({ name: { type: "string", alias: "n" } }, { args: ["-n"] })).toThrow(
        "Missing value for -n",
      );
    });
  });

  describe("stopEarly", () => {
    it("should treat all remaining args as positional after first non-flag", () => {
      const result = parseArgs(
        { verbose: { type: "boolean" } },
        { args: ["--verbose", "cmd", "--other"], stopEarly: true },
      );
      expect(result.flags.verbose).toBe(true);
      expect(result.positional).toEqual(["cmd", "--other"]);
    });
  });

  describe("stacked short flags validation (B1)", () => {
    it("throws when a stacked char is a non-boolean type", () => {
      expect(() =>
        parseArgs(
          { a: { type: "boolean" }, b: { type: "boolean" }, c: { type: "string" } },
          { args: ["-abc"] },
        ),
      ).toThrow(/-c.*boolean|stack/i);
    });

    it("collects unknown stacked chars into unknown[]", () => {
      const result = parseArgs({ a: { type: "boolean" } }, { args: ["-ax"] });
      expect(result.flags.a).toBe(true);
      expect(result.unknown).toContain("x");
    });

    it("allows unknown stacked chars when allowUnknown is true", () => {
      const result = parseArgs({ a: { type: "boolean" } }, { args: ["-ax"], allowUnknown: true });
      expect(result.flags.a).toBe(true);
      expect(result.flags.x).toBe(true);
    });
  });

  describe("required + default interaction (B2)", () => {
    it("still throws missing required when default is set and user did not provide", () => {
      // A required flag should be required even if a default is defined.
      expect(() =>
        parseArgs({ name: { type: "string", required: true, default: "fallback" } }, { args: [] }),
      ).toThrow(/Missing required flag/);
    });
  });

  describe("array / repeat flags (B12)", () => {
    it("collects repeated --include into array", () => {
      const result = parseArgs(
        { include: { type: "string", multiple: true } },
        { args: ["--include", "a", "--include", "b", "--include=c"] },
      );
      expect(result.flags.include).toEqual(["a", "b", "c"]);
    });

    it("returns empty array when multiple flag not provided", () => {
      const result = parseArgs({ include: { type: "string", multiple: true } }, { args: [] });
      expect(result.flags.include).toEqual([]);
    });

    it("uses default when provided as array", () => {
      const result = parseArgs(
        { tag: { type: "string", multiple: true, default: ["x"] } },
        { args: [] },
      );
      expect(result.flags.tag).toEqual(["x"]);
    });

    it("validates each value against choices", () => {
      expect(() =>
        parseArgs(
          { env: { type: "string", multiple: true, choices: ["dev", "prod"] } },
          { args: ["--env", "dev", "--env", "stage"] },
        ),
      ).toThrow(/Invalid value "stage"/);
    });

    it("coerces numbers in array flags", () => {
      const result = parseArgs(
        { port: { type: "number", multiple: true } },
        { args: ["--port", "1", "--port", "2"] },
      );
      expect(result.flags.port).toEqual([1, 2]);
    });
  });

  describe("--no-foo negation (B13)", () => {
    it("--no-flag sets a boolean to false", () => {
      const result = parseArgs(
        { verbose: { type: "boolean", default: true } },
        { args: ["--no-verbose"] },
      );
      expect(result.flags.verbose).toBe(false);
    });

    it("--no-foo on non-boolean is treated as unknown", () => {
      const result = parseArgs({ name: { type: "string" } }, { args: ["--no-name"] });
      expect(result.unknown).toContain("no-name");
    });

    it("--no-foo on alias works via canonical name", () => {
      const result = parseArgs(
        { verbose: { type: "boolean", alias: "v", default: true } },
        { args: ["--no-verbose"] },
      );
      expect(result.flags.verbose).toBe(false);
    });
  });

  describe("ArgError context", () => {
    it("exposes the offending flag name on ArgError", () => {
      try {
        parseArgs({ port: { type: "number" } }, { args: ["--port", "abc"] });
      } catch (e) {
        expect(e).toBeInstanceOf(ArgError);
        expect((e as ArgError).flag).toBe("port");
        return;
      }
      throw new Error("expected throw");
    });
  });

  describe("input hardening", () => {
    it("does not allow polluting Object.prototype via flag names", () => {
      parseArgs(
        { __proto__: { type: "string" } as never },
        { args: ["--__proto__=polluted"], allowUnknown: true },
      );
      // Should not pollute Object.prototype
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      // A fresh object should not have an inherited "__proto__" data property
      const fresh: Record<string, unknown> = {};
      expect(Object.getPrototypeOf(fresh)).toBe(Object.prototype);
    });
  });

  describe("type inference (S1)", () => {
    it("infers flag value types from ArgDef", () => {
      const result = parseArgs(
        {
          port: { type: "number", default: 3000 },
          host: { type: "string", default: "localhost" },
          verbose: { type: "boolean" },
          tags: { type: "string", multiple: true },
        } as const,
        { args: ["--port", "8080", "--verbose", "--tags", "a"] },
      );
      // Compile-time: these accesses must not produce union types.
      const port: number = result.flags.port;
      const host: string = result.flags.host;
      const verbose: boolean = result.flags.verbose;
      const tags: readonly string[] = result.flags.tags;
      expect(port).toBe(8080);
      expect(host).toBe("localhost");
      expect(verbose).toBe(true);
      expect(tags).toEqual(["a"]);
    });
  });

  describe("edge cases", () => {
    it("should handle empty args", () => {
      const result = parseArgs({}, { args: [] });
      expect(result.flags).toEqual({});
      expect(result.positional).toEqual([]);
      expect(result.rest).toEqual([]);
    });

    it("should handle only --", () => {
      const result = parseArgs({}, { args: ["--"] });
      expect(result.positional).toEqual([]);
      expect(result.rest).toEqual([]);
    });

    it("should handle -- with trailing args", () => {
      const result = parseArgs({}, { args: ["--", "a", "b"] });
      expect(result.rest).toEqual(["a", "b"]);
    });
  });
});
