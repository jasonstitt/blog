---
date: 2009-04-18
title: 'GMP bignums vs. Python bignums: performance and code examples'
tags: python
---

Interpreted languages such as Python are traditionally used in IO-bound applications where their lack of high CPU-bound performance does not matter. On the other hand, extensions written in C (or C++) can be used to implement computationally heavy operations that can be called from Python as if they were native functions.

Of course, it's not quite that simple. As soon as data types and structures more complicated than simple integers, floats, and strings become involved, you have to consider both the implementation of the types in C and data interchange between the C layer and the high-level language, whether through serialization or through a data-access API. Furthermore, you might be surprised at what actually does, and does not, result in a gain in performance.

In this article, I've implemented n-choose-k, or `choose(n, k)` for languages that don't support arbitrary infix operators, in Python and C. The choose function is useful in combinatorics and evaluates to the number of unordered subsets of size `k` that can be chosen from a set of size `n`.

Besides being practical, choose requires dividing factorials, which means very large numbers and lots of arithmetic operations. N-choose-k can be implemented in terms of factorials like this:

    choose(n, k) == factorial(n) / (factorial(k) * factorial(n - k))

Because k ≤ n in all normal cases, a small optimization is possible by simplifying `factorial(n) / factorial(k)` into a stopped factorial function. In other words, evaluate [n × (n - 1) × ... × k]. This saves 2k multiplications versus computing the full factorials of both n and k.

## Pure Python Version

Versions of the factorial and choose functions implemented in pure Python will serve as references; theoretically, the C version should improve on the performance of the Python version, or there's no point. Because Python has a 1,000-call recursion limit and does not optimize tail recursion, an iterative algorithm is best. The choice of 50,000 and 50 as parameters is arbitrary and will take a long enough time to execute that differences in performance between versions will be obvious.

```python
def factorial(n, stop=0):
    o = 1
    while n > stop:
        o *= n
        n -= 1
    return o

def choose(n, k):
    return factorial(n, stop=k) / factorial(n - k)

if __name__ == '__main__':
    print choose(50000, 50)
```

## The First C Version

A naive version in C would duplicate the Python code above, using C `unsigned long long` arguments instead of Python objects. This would lead to an upper bound of 1.8e19, a value easily exceeded by the factorial function at n=21.

In order to get around this limitation, we need a bignum or bigint library, which can represent arbitrary-precision integers. As it happens, Python intrinsically supports bignums in pure Python code, and also exposes a C API to its bignum objects. Perhaps we could use Python's bignum library while writing the algorithm in C for speed.

Additionally, a [Pyrex](http://www.cosc.canterbury.ac.nz/greg.ewing/python/Pyrex/) wrapper, shown below the C code, will make it easy to generate a module usable from Python.

The code below implements C functions for stopped factorial and choose, which use Python objects throughout. We'll call this `choose1.c`, which distinguishes it from the `choose.c` that Pyrex will generate (and foreshadows that there will be a `choose2.c`.)

_`choose1.c`_:

```c
#include <Python.h>

PyObject* factorial1(PyObject* n, PyObject* stop) {
    PyObject* dec = PyLong_FromLong(1);
    PyObject* counter = PyLong_FromLong(1);
    PyObject* n1 = PyNumber_Long(n);
    PyObject* placeholder;
    while(1 == PyObject_Compare(n1, stop)) {
        placeholder = PyNumber_Multiply(counter, n1);
        Py_DECREF(counter);
        counter = placeholder;

        placeholder = PyNumber_Subtract(n1, dec);
        Py_DECREF(n1);
        n1 = placeholder;
    }
    Py_DECREF(dec);
    Py_DECREF(n);
    return counter;
}

PyObject* choose1(PyObject* n, PyObject* k) {
    PyObject* zero = PyLong_FromLong(0);
    PyObject* nk = PyNumber_Subtract(n, k);
    PyObject* fact1 = factorial(n, k);
    PyObject* fact2 = factorial(nk, zero);
    PyObject* result = PyNumber_FloorDivide(fact1, fact2);
    Py_DECREF(nk);
    Py_DECREF(zero);
    Py_DECREF(fact1);
    Py_DECREF(fact2);
    return result;
}
```

You might wonder why this code uses a placeholder value and does not use the available in-place arithmetic functions. This is because Python integers are immutable objects. Using `PyNumber_InPlaceMultiply` and `PyNumber_InPlaceSubtract` actually produces the same results as the above.

Using immutable types has performance consequences. In calculating 50,000 choose 50, for instance, this code will instantiate and destroy about 199,850 objects inside the main loop of the factorial function (given that instances of the integers from -1 to 100 are kept in a static table and not instantiated dynamically). More on performance later.

The following Pyrex source code and distutils configuration wrap the C code as a Python function called choose().

_`choose.pyx`_:

```python
cdef extern from "choose1.c":
    object _choose1 "choose1" (object n, object k)

def choose(n, k):
    return _choose1(n, k)

```

_`setup.py`_:

```python
from distutils.core import setup
from distutils.extension import Extension
from Pyrex.Distutils import build_ext
setup(
  name = "choose",
  ext_modules=[
    Extension("choose", ["choose.pyx"])
    ],
  cmdclass = {'build_ext': build_ext}
)

```

Finally, the following code uses the library and will be the point of comparison to the pure Python version.

```python testc.py
if __name__ == '__main__':
    from choose import choose
    print choose(50000, 50)
```

## Performance Comparison

There are numerous ways of comparing execution times. In this example, I'm using the `time` utility rather than something in Python such as the `timeit` module.

```sh
$ time python testpure.py

284958500315333290867708487072990268397101930544468658
476216100935982755508148971449700622210078705183923286
686402942943816349032142836981589618876226813174803825
580124000

real    0m14.921s
user    0m9.211s
sys     0m4.151s

$ time python testc.py

284958500315333290867708487072990268397101930544468658
476216100935982755508148971449700622210078705183923286
686402942943816349032142836981589618876226813174803825
580124000

real    0m14.460s
user    0m9.146s
sys     0m4.000s
```

What a surprise! Accounting for normal variations in performance based on background CPU load, the two versions take effectively the same amount of time. It looks as though the overhead in the pure Python version is not, as you might assume, in the fact that Python is interpreted rather than compiled. By using Python objects and memory management, the C version runs just as slowly.

## Replacing Python bignums with GMP

The [GNU Multiple Precision Arithmetic Library](http://gmplib.org/) (GMP) is a bignum library that supports integers, fractions, and floating-point numbers, and is usable from C or C++.

GMP allows true in-place arithmetic operations, which might make it faster than the Python version, which allocates and deallocates objects on every iteration of the main loop. It's also very easy to mix GMP's bignums and unsigned longs, as well as producing string representations of GMP bignums in different bases.

Be sure to specify your host platform when building GMP. The first time I built it, I relied on `configure` to auto-detect everything, and it built a 64-bit library for my definitively 32-bit computer. Read the section in the manual on [GMP Build Options](http://gmplib.org/manual/Build-Options.html#Build-Options) to figure out the right `host` argument to `configure`; for instance, mine on a 32-bit OS X system was `--host=i386-apple-darwin`.

The following code listings implement the `factorial` and `choose` functions using GMP and update the Pyrex wrapper. While I won't try to duplicate the [GMP Manual](http://gmplib.org/manual/) here, it's worth noting that its functions tend to operate on arguments rather than returning values, and variables need to be initialized and cleaned up.

The prefixes used are `mi` for GMP multi-precision integer (distinct from the `mpz` prefix used by the library), `pi` for Python integer, and `ps` for Python string.

_`choose2.c`_:

```c
#include <Python.h>
#include <gmp.h>

void mi_factorial(mpz_t mi_result, unsigned long n, unsigned long stop) {
    unsigned long int n1 = n;
    mpz_set_ui(mi_result, 1);
    while(n1 > stop) {
        mpz_mul_ui(mi_result, mi_result, n1--);
    }
}

PyObject* choose2(unsigned long n, unsigned long k) {
    mpz_t mi_fact1;
    mpz_t mi_fact2;
    mpz_t mi_result;
    char* buffer;
    PyObject* ps_result;
    PyObject* pi_result;

    mpz_init(mi_fact1);
    mpz_init(mi_fact2);
    mpz_init(mi_result);

    mi_factorial(mi_fact1, n, k);
    mi_factorial(mi_fact2, n - k, 0);
    mpz_cdiv_q(mi_result, mi_fact1, mi_fact2);

    buffer = malloc(mpz_sizeinbase(mi_result, 10) + 2);
    mpz_get_str(buffer, 10, mi_result);
    ps_result = PyString_FromString(buffer);
    pi_result = PyNumber_Long(ps_result);

    mpz_clear(mi_fact1);
    mpz_clear(mi_fact2);
    mpz_clear(mi_result);
    free(buffer);
    Py_DECREF(ps_result);

    return pi_result;
}

```

_`choose.pyx (revised)`_:

```python
cdef extern from "choose1.c":
    object _choose1 "choose1" (object n, object k)

cdef extern from "choose2.c":
    object _choose2 "choose2" (unsigned long n, unsigned long k)

def choose(n, k):
    return _choose1(n, k)

def gmpchoose(n, k):
    return _choose2(n, k)

```

_`setup.py (revised)`_:

```python
from distutils.core import setup
from distutils.extension import Extension
from Pyrex.Distutils import build_ext
setup(
  name = "choose",
  ext_modules=[
    Extension("choose", ["choose.pyx"], libraries=['gmp'])
    ],
  cmdclass = {'build_ext': build_ext}
)

```

_`testgmp.py`:_

```python
if __name__ == '__main__':
    from choose import gmpchoose
    print gmpchoose(50000, 50)

```

And, finally, the result we've been waiting for:

```sh
$ time python testgmp.py

284958500315333290867708487072990268397101930544468658
476216100935982755508148971449700622210078705183923286
686402942943816349032142836981589618876226813174803825
580124000

real    0m2.042s
user    0m1.993s
sys     0m0.033s
```

Using the GMP library has cut execution time on this hardware down to around 2 seconds, from around 13-15 seconds.

## Conclusion

When implementing C extensions to speed up Python programs, there are more considerations than just "switch to compiled language, see speed increase." Python provides many data types and structures that must be duplicated in the C program, and using the Python API heavily may lead to a slight or nonexistent gain in performance. Meanwhile, using other libraries may require interconversion (e.g. here, the GMP multi-precision integer is converted to a Python integer by way of a decimal string representation).

For purely numeric functions that deal only in values that fit within standard C types, it's relatively easy to create large speedups. Once other types, such as strings and bignums, become involved, the work starts to build up. However, the reward can still be substantial: here, the final C extension using GMP resulted in an 86% reduction in execution time. The results above do not mean that GMP is more performant than Python bignums in general, but the difference in performance in this case is obvious.
