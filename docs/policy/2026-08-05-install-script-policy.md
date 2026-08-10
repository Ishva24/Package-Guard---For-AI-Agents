# Install Script Policy for PackageGuard

Install scripts are a high-leverage supply-chain risk because they execute during dependency setup. PackageGuard should classify preinstall, install, postinstall, prepare, and native build hooks, then require stricter review for network access, shell execution, credential references, or opaque binary downloads.
