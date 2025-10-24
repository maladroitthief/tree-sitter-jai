i01 :: 42;
i02 :: 4_2;
i03 :: 0600;
i04 :: 0_600;
i05 :: 0b101;
i06 :: 0B101;
i07 :: 0xBadFace;
i08 :: 0xBad_Face;
i09 :: 0x_67_7a_2f_cc_40_c6;

f01 :: 0.;
f02 :: 72.40;
f03 :: 072.40;
f04 :: 2.71828;
f05 :: 1.e+0;
f06 :: 6.67428e-11;
f07 :: .25;
f08 :: .12345E+5;
f09 :: 1_5.;
f10 :: 0.15e+0_2;

a :: "0";
b :: "`\"`";
c :: "\x0c";
e :: #string DONE
Look at this backslash in quotes: "\"
DONE
f :: #string,cr END
This line ends with carriage-return+line-feed:
This one too
END

LowIndex :: #type, isa int;
