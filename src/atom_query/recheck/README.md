This repo is verifying the output of Jeremiah's script and the data that we had.

https://github.com/cosmos/cutlery
vs
https://github.com/cosmos/fundraiser-lib/blob/master/src/atom_query/data/fundraiser_atoms.json

The expected allocations from Jeremiah's script is parsed and rounded naively to the 10's, and output as "expected_allocations.chewed.txt".
The expected allocations from the original cosmos/fundraiser-lib is modified to exclude pre-fundraiser/AIB/ICF amounts and saved as "fundraiser_atoms.json".
Then, this file is processed with the same script as above to be rounded naively to the 10's and saved as "fundraiser_atoms.chewed.txt".

The difference between the two files is as follows:

```
< 0aefcaed3f89fc0df1de386bb4c40acd2384de6b,22610
---
> 0aefcaed3f89fc0df1de386bb4c40acd2384de6b,22600
68c68
< 10b9b3466a3f976ef09dab59bafee2bdd8bc774c,180920
---
> 10b9b3466a3f976ef09dab59bafee2bdd8bc774c,180910
117c117
< 2029e2b989edab44476d60e4aed43b86f7993b2e,4500
---
> 2029e2b989edab44476d60e4aed43b86f7993b2e,4490
237c237
< 4266d8b41507736f8a6976ba0b38a3920bc26c19,53100
---
> 4266d8b41507736f8a6976ba0b38a3920bc26c19,53090
408d407
< 742bcfb417cae2b6d36c99c3af255bab705bb5e8,45340
409a409
> 742bcfb417cae2b6d36c99c3af255bab705bb5e8,45340
511c511
< 928828816fa1cb24a53cad5b2ef7725450c96d67,1356900
---
> 928828816fa1cb24a53cad5b2ef7725450c96d67,1356890
610c610
< aff9f5a716cdd701304eae6fc7f42c80fdeea584,18092000
---
> aff9f5a716cdd701304eae6fc7f42c80fdeea584,10000000
795c795
< ecaf0440d1bc141bd1d84ef90a44b71c2195f99d,10022090
---
> ecaf0440d1bc141bd1d84ef90a44b71c2195f99d,10022060
```

This shows that few items that are different due to naive rounding, with the
only exception being "aff9f5a716cdd701304eae6fc7f42c80fdeea584,10000000" which
was the ETH whale refund.  So, this script shows that Jeremiah's script
produced values that match the existing fundraiser_atoms.json allocation except
for minor rounding differences, and the whale refund.

The differences due to rounding are due to rounding errors due to the orignial
atom_allocations.json being computed as a sum of individual ETH contributions
which are each rounded to a whole atom number, vs Jeremiah's figures which are
rounded after first computing the total ETH contribution.  We will take the
former (old atom_allocations.json) allocation as canon.  In other words,
there's nothing we need to change from the old atom_allocations.json
distribution.
