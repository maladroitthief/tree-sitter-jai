// Credits to the following sources
// - tree-sitter-odin and the other tree-sitter-jai implementations (general inspiration)
// - tree-sitter-go (for the integer and floats matching)
// - tree-sitter-tlaplus (for nested block comments)
// - tree-sitter-php for the heredoc stuff

/// <reference types="tree-sitter-cli/dsl" />
// @ts-nocheck

const PREC = {
  primary: 7,
  unary: 6,
  multiplicative: 5,
  additive: 4,
  comparative: 3,
  and: 2,
  or: 1,
  composite_literal: -1,
  array_literal: -2,
};

const multiplicativeOperators = ['*', '/', '%', '<<', '>>', '&', '&^'];
const additiveOperators = ['+', '-', '|', '^'];
const comparativeOperators = ['==', '!=', '<', '<=', '>', '>='];
const assignmentOperators = multiplicativeOperators.concat(additiveOperators).map(
  operator => operator + '='
).concat('=');

const newline = /\r?\n|\r/;
const terminator = choice(newline, ';', '\0');

const binaryDigit = /[01]/;
const binaryDigits = seq(binaryDigit, repeat(seq(optional('_'), binaryDigit)));
const binaryLiteral = seq('0', choice('b', 'B'), optional('_'), binaryDigits);

const decimalDigit = /[0-9]/;
const decimalDigits = seq(decimalDigit, repeat(seq(optional('_'), decimalDigit)));
const decimalLiteral = choice('0', seq(/[1-9]/, optional(seq(optional('_'), decimalDigits))));

const hexDigit = /[0-9a-fA-F]/;
const hexDigits = seq(hexDigit, repeat(seq(optional('_'), hexDigit)));
const hexLiteral = seq('0', choice('x', 'X', 'h', 'H'), optional('_'), hexDigits);

const intLiteral = choice(
  token(binaryLiteral),
  token(decimalDigits),
  token(decimalLiteral),
  token(hexLiteral),
);

const decimalExponent = seq(choice('e', 'E'), optional(choice('+', '-')), decimalDigits);
const decimalFloatLiteral = choice(
  seq(decimalDigits, '.', optional(decimalDigits), optional(decimalExponent)),
  seq(decimalDigits, decimalExponent),
  seq('.', decimalDigits, optional(decimalExponent)),
);

const floatLiteral = choice(
  token(decimalFloatLiteral),
);

module.exports = grammar({
  name: "jai",

  extras: $ => [
    $.comment,
    $.note,
    /\s/,
    // $.heredoc_body,
  ],

  inline: $ => [
    // todo: understand what this is doing
    $._type,
    $._type_identifier,
    $._field_identifier,
    $._top_level_declaration,
    $._string_literal,
    // $._interface_elem,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    // todo: understand what this is doing
    [$._type, $._expression],
    // [$._simple_type, $.generic_type, $._expression],
    [$.qualified_type, $._expression],
    [$._expression, $.const_declaration],
    // [$.generic_type, $._simple_type],
    // [$.parameter_declaration, $._simple_type],
    // [$.type_parameter_declaration, $._simple_type, $._expression],
    // [$.type_parameter_declaration, $._expression],
    // [$.type_parameter_declaration, $._simple_type, $.generic_type, $._expression],
    // [$.heredoc_body],
  ],

  reserved: {
    // todo: figure out what is going on here -ian
    global: $ => [
      // "if", "xx", "ifx", "for", "then", "else", "null", "case",
      // "enum", "true", "cast", "while", "break", "using", "defer",
      // "false", "union", "return", "struct", "inline", "remove",
      // "type_of", "continue", "operator", "no_inline", "interface",
      // "enum_flags", "push_context",
    ],
  },

  externals: $ => [
    // todo: understand what this is doing
    // $.error_sentinel,
    //
    // $.heredoc_start,
    // $.heredoc_end,
  ],

  supertypes: $ => [
    // todo: understand what this is doing
    $._expression,
    $._type,
    $._statement,
  ],

  rules: {
    source_file: $ => seq(
      repeat(choice(
        seq($._statement, terminator),
        seq($._top_level_declaration, terminator)
      )),
    ),

    _top_level_declaration: $ => choice(
      // $.function_declaration,
      $.import_declaration,
    ),

    import_declaration: $ => seq(
      optional(seq(field('name', $.identifier), '::')),
      alias($._import, $.directive),
      optional(choice(
        $._file_modifier,
        $._dir_modifier,
        $._string_modifier,
      )),
      field('path', $._string_literal),
    ),
    _file_modifier: _ => seq(',', 'file'),
    _dir_modifier: _ => seq(',', 'dir'),
    _string_modifier: _ => seq(',', 'string'),

    _statement: $ => choice(
      $._declaration,
      // $._simple_statement,
      // $.return_statement,
      // $.defer_statement,
      // $.if_statement,
      // $.for_statement,
      // $.expression_switch_statement,
      // $.type_switch_statement,
      // $.select_statement,
      // $.labeled_statement,
      // $.fallthrough_statement,
      // $.break_statement,
      // $.continue_statement,
      // $.goto_statement,
      // $.block,
      // $.empty_statement,
    ),

    _expression: $ => choice(
      // $.unary_expression,
      // $.binary_expression,
      // $.selector_expression,
      // $.index_expression,
      // $.slice_expression,
      // $.call_expression,
      // $.type_assertion_expression,
      // $.type_conversion_expression,
      // $.type_instantiation_expression,
      $.identifier,
      // alias(choice('new', 'make'), $.identifier),
      $.struct_literal,
      $.array_literal,
      // $.func_literal,
      $._string_literal,
      $.int_literal,
      $.float_literal,
      // $.imaginary_literal,
      // $.rune_literal,
      $.null,
      $.true,
      $.false,
      $.iota,
      // $.parenthesized_expression,
    ),

    _declaration: $ => choice(
      $.const_declaration,
      // $.type_declaration,
      $.var_declaration,
    ),

    _type: $ => choice(
      prec.dynamic(-1, $._type_identifier),
      // $.qualified_type,
      // $.pointer_type,
      $.struct_type,
      // $.union_type,
      // $.enum_type,
      $.array_type,
      $.array_view_type,
      // $.function_type,
      // $.negated_type,
      // $.polymorphic_type,
    ),

    pointer_type: $ => prec(PREC.unary, seq('*', $._type)),
    qualified_type: $ => seq(
      field('import', $._import_identifier),
      '.',
      field('name', $._type_identifier),
    ),

    const_declaration: $ => seq(
      field('name', $.identifier),
      choice(
        '::',
        seq(
          ':',
          optional(field('type', $._type)),
          ':',
        )
      ),
      field('value', $.expression_list),
    ),
    var_declaration: $ => seq(
      field('name', $.identifier),
      choice(
        seq(
          ':=',
          field('value', $.expression_list),
        ),
        seq(
          ':',
          optional(field('type', $._type)),
          optional(seq(
            '=',
            field('value', $.expression_list),
          )),
        ),
      ),
    ),
    expression_list: $ => commaSep1($._expression),
    argument_list: $ => seq(
      '(',
      optional(seq(
        $._expression,
        repeat(seq(',', $._expression)),
        optional(','),
      )),
      ')',
    ),

    parameter_list: $ => seq(
      '(',
      optional(seq(
        commaSep1($.parameter_declaration),
        optional(','),
      )),
      ')',
    ),
    parameter_declaration: $ => seq(
      commaSep1(field('name', $.identifier)),
      field('type', $._type),
    ),


    identifier: _ => /[_\p{XID_Start}][_\p{XID_Continue}]*/,

    _type_identifier: $ => alias($.identifier, $.type_identifier),
    _field_identifier: $ => alias($.identifier, $.field_identifier),
    _import_identifier: $ => alias($.identifier, $.import_identifier),
    _directive_identifier: $ => alias(seq('#', commaSep1($.identifier)), $.directive_identifier),

    _string_literal: $ => choice(
      $.interpreted_string_literal,
      // $.string_directive,
    ),

    interpreted_string_literal: $ => seq(
      '"',
      repeat(choice(
        alias(token.immediate(prec(1, /[^"\n\\]+/)), $.interpreted_string_literal_content),
        $.escape_sequence,
      )),
      token.immediate('"'),
    ),

    // string_directive: $ => seq(
    //   field('directive', '#string'),
    //   $.heredoc_start,
    //   repeat($.heredoc_body),
    //   $.heredoc_end,
    // ),
    //
    // heredoc_body: _ => choice(
    //   prec(2, token(/[^\s]+/)),
    //   prec(2, token('/*'))
    // ),

    struct_literal: $ => prec(PREC.composite_literal, seq(
      field('type', choice(
        $.struct_type,
        $._type_identifier,
        // $.qualified_type,
      )),
      field('body', $.struct_value),
    )),

    struct_type: $ => seq(
      choice(
        seq(
          'struct',
          optional($._directive_identifier),
          field('modifier', optional($.argument_list)),
          $.struct_block,
        ),
        seq(
          field('type', $.identifier),
          $.argument_list,
        ),
      ),
    ),

    struct_block: $ => prec.left(seq(
      '{',
      optional(repeat(choice(
        $.field_declaration,
      ))),
      '}',
    )),

    field_declaration: $ => seq(
      choice(
        seq(
          commaSep1(field('name', $._field_identifier)),
          ":",
          field('type', $._type),
          optional(seq("=", field('value', $.literal_element))),
          terminator,
        ),
      ),
      field('tag', optional($._string_literal)),
    ),

    struct_value: $ => seq(
      '.{',
      optional(
        seq(
          commaSep1($.keyed_element),
          optional(','))),
      '}',
    ),
    keyed_element: $ => seq(
      field('key', $.literal_element),
      '=',
      field('value', $.literal_element),
    ),

    array_type: $ => prec.right(seq(
      '[',
      field('length', $._expression),
      ']',
      field('element', $._type),
    )),

    array_literal: $ => prec(PREC.array_literal, seq(
      optional(field('type', choice(
        $.array_type,
        $.array_view_type,
        $.implicit_length_array_type,
      ))),
      field('body', $.array_value),
    )),
    array_type: $ => prec.right(seq(
      '[',
      field('length', $._expression),
      ']',
      field('element', $._type),
    )),
    array_view_type: $ => prec.right(seq(
      '[',
      ']',
      field('element', $._type),
    )),
    implicit_length_array_type: $ => seq(
      '[',
      '..',
      ']',
      field('element', $._type),
    ),
    array_value: $ => seq(
      '.[',
      optional(
        seq(
          commaSep1($.literal_element),
          optional(','))),
      ']',
    ),
    literal_element: $ => choice(
      $._expression,
      // $.literal_value,
    ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        /[^xuU]/,
        /\d{2,3}/,
        /x[0-9a-fA-F]{2,}/,
        /u[0-9a-fA-F]{4}/,
        /U[0-9a-fA-F]{8}/,
      ),
    )),

    note: $ => token(prec(-1, seq('@', /[^\s;]+|"[^"\\\n]*"/))),

    comment: _ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/',
      ),
    )),

    _import: _ => '#import',
    _string: _ => '#string',

    int_literal: _ => token(intLiteral),
    float_literal: _ => token(floatLiteral),
    null: _ => 'null',
    true: _ => 'true',
    false: _ => 'false',
    iota: _ => 'iota',

  }
});

function regexOr(regex) {
  if (arguments.length > 1) {
    regex = Array.from(arguments).join('|');
  }
  return {
    type: 'PATTERN',
    value: regex
  };
}

// Creates a rule to match zero or more occurrences of `rule` separated by `sep`
function sep(rule, s) {
  return optional(seq(rule, repeat(seq(s, optional(rule)))));
}

// Creates a rule to match one or more occurrences of `rule` separated by `sep`
function sep1(rule, s) {
  return seq(rule, repeat(seq(s, rule)));
}

// Same as sep1, but allows passing right precedence
function sep1PrecRight(p, rule, s) {
  return seq(rule, repeat(prec.right(p, seq(s, rule))));
}

// Same as sep1, but allows passing precedence
function sep1Prec(p, rule, s) {
  return seq(rule, repeat(prec(p, seq(s, rule))));
}

// Creates a rule to match one or more of the rules separated by a comma
function commaSep1(rule) {
  return sep1(rule, ',');
}
